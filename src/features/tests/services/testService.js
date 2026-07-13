const { Prisma } = require('@prisma/client');
const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const {
  parsePagination,
  buildPaginationMeta,
} = require('../../../utils/query');
const {
  collectDescendantIds,
  buildSourcePath,
} = require('../../contentNodes/services/contentNodeService');
const { ensureDefaultTestMeta, getStatusByCode } = require('../../testMeta/services/testMetaService');

const shuffle = (items) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const testListSelect = {
  id: true,
  title: true,
  description: true,
  classId: true,
  subjectId: true,
  testTypeId: true,
  testStatusId: true,
  totalMarks: true,
  durationMinutes: true,
  generatedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  class: { select: { id: true, name: true } },
  subject: { select: { id: true, name: true } },
  testType: { select: { id: true, name: true, code: true } },
  testStatus: { select: { id: true, name: true, code: true } },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: { select: { questions: true, sources: true } },
};

const testDetailSelect = {
  ...testListSelect,
  instructions: true,
  sources: {
    select: {
      id: true,
      contentNodeId: true,
      contentNode: {
        select: { id: true, title: true, type: true, subjectId: true },
      },
    },
  },
  rules: {
    select: {
      id: true,
      questionType: true,
      difficulty: true,
      count: true,
      marksEach: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: 'asc' },
  },
  questions: {
    select: {
      id: true,
      questionId: true,
      sortOrder: true,
      questionType: true,
      difficulty: true,
      text: true,
      marks: true,
      allowMultipleCorrect: true,
      explanation: true,
      sourcePath: true,
      options: {
        select: {
          id: true,
          text: true,
          isCorrect: true,
          sortOrder: true,
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
};

const listTests = async (query = {}, userId) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {
    createdById: userId,
  };

  if (query.search?.trim()) {
    where.title = { contains: query.search.trim(), mode: 'insensitive' };
  }
  if (query.classId) where.classId = query.classId;
  if (query.subjectId) where.subjectId = query.subjectId;
  if (query.testTypeId) where.testTypeId = query.testTypeId;
  if (query.testStatusId) where.testStatusId = query.testStatusId;

  const [tests, total] = await Promise.all([
    prisma.test.findMany({
      where,
      select: testListSelect,
      orderBy: [{ generatedAt: 'desc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.test.count({ where }),
  ]);

  return { tests, pagination: buildPaginationMeta(total, page, limit) };
};

const getTestById = async (id, userId) => {
  const test = await prisma.test.findFirst({
    where: { id, createdById: userId },
    select: testDetailSelect,
  });
  if (!test) throw new AppError('Test not found', 404);
  return test;
};

const pickQuestionsForRule = async ({
  nodeIds,
  questionType,
  difficulty,
  count,
  excludeIds,
}) => {
  const candidates = await prisma.question.findMany({
    where: {
      contentNodeId: { in: nodeIds },
      type: questionType,
      difficulty,
      isActive: true,
      id: { notIn: [...excludeIds] },
    },
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (candidates.length < count) {
    throw new AppError(
      `Not enough active ${difficulty} ${questionType} questions in the selected sections. Need ${count}, found ${candidates.length}.`,
      400
    );
  }

  return shuffle(candidates).slice(0, count);
};

const generateTest = async (payload, createdById) => {
  await ensureDefaultTestMeta();

  const {
    title,
    description,
    instructions,
    classId,
    subjectId,
    testTypeId,
    testStatusId,
    contentNodeIds,
    rules,
    durationMinutes,
  } = payload;

  if (!Array.isArray(contentNodeIds) || contentNodeIds.length === 0) {
    throw new AppError('Select at least one content section', 400);
  }

  if (!Array.isArray(rules) || rules.length === 0) {
    throw new AppError('Provide at least one generation rule', 400);
  }

  const nodes = await prisma.contentNode.findMany({
    where: { id: { in: contentNodeIds } },
    select: { id: true, subjectId: true },
  });

  if (nodes.length !== contentNodeIds.length) {
    throw new AppError('One or more content sections were not found', 404);
  }

  if (subjectId) {
    const invalid = nodes.some((node) => node.subjectId !== subjectId);
    if (invalid) {
      throw new AppError('All selected sections must belong to the given subject', 400);
    }
  }

  const testType = await prisma.testType.findUnique({ where: { id: testTypeId } });
  if (!testType || !testType.isActive) {
    throw new AppError('Test type not found or inactive', 404);
  }

  let resolvedStatusId = testStatusId;
  if (!resolvedStatusId) {
    const generated = await prisma.testStatus.findUnique({ where: { code: 'GENERATED' } });
    if (!generated) throw new AppError('Default GENERATED status is missing', 500);
    resolvedStatusId = generated.id;
  } else {
    const status = await prisma.testStatus.findUnique({ where: { id: resolvedStatusId } });
    if (!status || !status.isActive) {
      throw new AppError('Test status not found or inactive', 404);
    }
  }

  if (classId) {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) throw new AppError('Class not found', 404);
  }

  if (subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new AppError('Subject not found', 404);
  }

  const nodeIds = await collectDescendantIds(contentNodeIds);
  const usedQuestionIds = new Set();
  const pickedByRule = [];

  for (const [index, rule] of rules.entries()) {
    const picked = await pickQuestionsForRule({
      nodeIds,
      questionType: rule.questionType,
      difficulty: rule.difficulty,
      count: rule.count,
      excludeIds: usedQuestionIds,
    });

    picked.forEach((q) => usedQuestionIds.add(q.id));
    pickedByRule.push({ rule, questions: picked, sortOrder: rule.sortOrder ?? index });
  }

  const pathCache = new Map();
  const getPath = async (contentNodeId) => {
    if (!pathCache.has(contentNodeId)) {
      pathCache.set(contentNodeId, await buildSourcePath(contentNodeId));
    }
    return pathCache.get(contentNodeId);
  };

  let sortOrder = 0;
  let totalMarks = new Prisma.Decimal(0);
  const snapshotQuestions = [];

  for (const { rule, questions } of pickedByRule) {
    for (const question of questions) {
      const marks = rule.marksEach
        ? new Prisma.Decimal(rule.marksEach)
        : question.marks;
      totalMarks = totalMarks.add(marks);
      sortOrder += 1;

      snapshotQuestions.push({
        questionId: question.id,
        sortOrder,
        questionType: question.type,
        difficulty: question.difficulty,
        text: question.text,
        marks,
        allowMultipleCorrect: question.allowMultipleCorrect,
        explanation: question.explanation,
        sourcePath: await getPath(question.contentNodeId),
        options:
          question.type === 'MCQ'
            ? question.options.map((opt) => ({
                text: opt.text,
                isCorrect: opt.isCorrect,
                sortOrder: opt.sortOrder,
              }))
            : [],
      });
    }
  }

  const now = new Date();

  const test = await prisma.$transaction(async (tx) => {
    const created = await tx.test.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        instructions: instructions?.trim() || null,
        classId: classId || null,
        subjectId: subjectId || null,
        testTypeId,
        testStatusId: resolvedStatusId,
        totalMarks,
        durationMinutes: durationMinutes ?? null,
        generatedAt: now,
        createdById,
        sources: {
          create: contentNodeIds.map((contentNodeId) => ({ contentNodeId })),
        },
        rules: {
          create: rules.map((rule, index) => ({
            questionType: rule.questionType,
            difficulty: rule.difficulty,
            count: rule.count,
            marksEach: rule.marksEach
              ? new Prisma.Decimal(rule.marksEach)
              : null,
            sortOrder: rule.sortOrder ?? index,
          })),
        },
        questions: {
          create: snapshotQuestions.map((item) => ({
            questionId: item.questionId,
            sortOrder: item.sortOrder,
            questionType: item.questionType,
            difficulty: item.difficulty,
            text: item.text,
            marks: item.marks,
            allowMultipleCorrect: item.allowMultipleCorrect,
            explanation: item.explanation,
            sourcePath: item.sourcePath,
            options: item.options.length
              ? { create: item.options }
              : undefined,
          })),
        },
      },
      select: { id: true },
    });

    await Promise.all(
      [...usedQuestionIds].map((questionId) =>
        tx.question.update({
          where: { id: questionId },
          data: {
            timesUsed: { increment: 1 },
            lastUsedAt: now,
          },
        })
      )
    );

    return created;
  });

  return getTestById(test.id, createdById);
};

const assertDraft = (test) => {
  if (test.testStatus?.code !== 'DRAFT') {
    throw new AppError('Only draft papers can be edited', 400);
  }
};

const buildSnapshotsFromQuestionIds = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Select at least one question', 400);
  }

  const normalized = items.map((item, index) => {
    if (typeof item === 'string') {
      return { questionId: item, marks: null, sortOrder: index + 1 };
    }
    return {
      questionId: item.questionId || item.id,
      marks: item.marks ?? null,
      sortOrder: item.sortOrder ?? index + 1,
    };
  });

  const ids = normalized.map((item) => item.questionId);
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length !== ids.length) {
    throw new AppError('Duplicate questions are not allowed on a paper', 400);
  }

  const questions = await prisma.question.findMany({
    where: { id: { in: uniqueIds }, isActive: true },
    include: {
      options: { orderBy: { sortOrder: 'asc' } },
    },
  });

  if (questions.length !== uniqueIds.length) {
    throw new AppError('One or more questions were not found or are inactive', 404);
  }

  const byId = new Map(questions.map((q) => [q.id, q]));
  const pathCache = new Map();
  const getPath = async (contentNodeId) => {
    if (!pathCache.has(contentNodeId)) {
      pathCache.set(contentNodeId, await buildSourcePath(contentNodeId));
    }
    return pathCache.get(contentNodeId);
  };

  let totalMarks = new Prisma.Decimal(0);
  const snapshots = [];
  const contentNodeIds = new Set();

  for (const item of normalized) {
    const question = byId.get(item.questionId);
    const marks =
      item.marks != null && item.marks !== ''
        ? new Prisma.Decimal(item.marks)
        : question.marks;
    totalMarks = totalMarks.add(marks);
    contentNodeIds.add(question.contentNodeId);

    snapshots.push({
      questionId: question.id,
      sortOrder: item.sortOrder,
      questionType: question.type,
      difficulty: question.difficulty,
      text: question.text,
      marks,
      allowMultipleCorrect: question.allowMultipleCorrect,
      explanation: question.explanation,
      sourcePath: await getPath(question.contentNodeId),
      options:
        question.type === 'MCQ'
          ? question.options.map((opt) => ({
              text: opt.text,
              isCorrect: opt.isCorrect,
              sortOrder: opt.sortOrder,
            }))
          : [],
    });
  }

  return {
    snapshots,
    totalMarks,
    contentNodeIds: [...contentNodeIds],
    questionIds: uniqueIds,
  };
};

const createManualTest = async (payload, createdById) => {
  await ensureDefaultTestMeta();

  const {
    title,
    description,
    instructions,
    classId,
    subjectId,
    testTypeId,
    durationMinutes,
    questions: questionItems,
    questionIds,
  } = payload;

  const items = questionItems?.length
    ? questionItems
    : (questionIds || []).map((id) => ({ questionId: id }));

  const testType = await prisma.testType.findUnique({ where: { id: testTypeId } });
  if (!testType || !testType.isActive) {
    throw new AppError('Test type not found or inactive', 404);
  }

  if (classId) {
    const classRecord = await prisma.class.findUnique({ where: { id: classId } });
    if (!classRecord) throw new AppError('Class not found', 404);
  }

  if (subjectId) {
    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) throw new AppError('Subject not found', 404);
    if (classId && subject.classId !== classId) {
      throw new AppError('Subject does not belong to the selected class', 400);
    }
  }

  const draftStatus = await getStatusByCode('DRAFT');
  const { snapshots, totalMarks, contentNodeIds } =
    await buildSnapshotsFromQuestionIds(items);

  if (subjectId) {
    const nodes = await prisma.contentNode.findMany({
      where: { id: { in: contentNodeIds } },
      select: { subjectId: true },
    });
    if (nodes.some((node) => node.subjectId !== subjectId)) {
      throw new AppError('All questions must belong to the selected subject', 400);
    }
  }

  const created = await prisma.test.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      instructions: instructions?.trim() || null,
      classId: classId || null,
      subjectId: subjectId || null,
      testTypeId,
      testStatusId: draftStatus.id,
      totalMarks,
      durationMinutes: durationMinutes ?? null,
      generatedAt: null,
      createdById,
      sources: {
        create: contentNodeIds.map((contentNodeId) => ({ contentNodeId })),
      },
      questions: {
        create: snapshots.map((item) => ({
          questionId: item.questionId,
          sortOrder: item.sortOrder,
          questionType: item.questionType,
          difficulty: item.difficulty,
          text: item.text,
          marks: item.marks,
          allowMultipleCorrect: item.allowMultipleCorrect,
          explanation: item.explanation,
          sourcePath: item.sourcePath,
          options: item.options.length ? { create: item.options } : undefined,
        })),
      },
    },
    select: { id: true },
  });

  return getTestById(created.id, createdById);
};

const replaceTestQuestions = async (id, payload, userId) => {
  const existing = await getTestById(id, userId);
  assertDraft(existing);

  const items = payload.questions?.length
    ? payload.questions
    : (payload.questionIds || []).map((qid) => ({ questionId: qid }));

  const { snapshots, totalMarks, contentNodeIds } =
    await buildSnapshotsFromQuestionIds(items);

  if (existing.subjectId) {
    const nodes = await prisma.contentNode.findMany({
      where: { id: { in: contentNodeIds } },
      select: { subjectId: true },
    });
    if (nodes.some((node) => node.subjectId !== existing.subjectId)) {
      throw new AppError('All questions must belong to the paper subject', 400);
    }
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.testQuestion.deleteMany({ where: { testId: id } });
      await tx.testSource.deleteMany({ where: { testId: id } });

      await tx.test.update({
        where: { id },
        data: { totalMarks },
      });

      if (contentNodeIds.length) {
        await tx.testSource.createMany({
          data: contentNodeIds.map((contentNodeId) => ({
            testId: id,
            contentNodeId,
          })),
        });
      }

      const createdQuestions = await tx.testQuestion.createManyAndReturn({
        data: snapshots.map((item) => ({
          testId: id,
          questionId: item.questionId,
          sortOrder: item.sortOrder,
          questionType: item.questionType,
          difficulty: item.difficulty,
          text: item.text,
          marks: item.marks,
          allowMultipleCorrect: item.allowMultipleCorrect,
          explanation: item.explanation,
          sourcePath: item.sourcePath,
        })),
      });

      const createdByKey = new Map(
        createdQuestions.map((row) => [
          `${row.questionId}:${row.sortOrder}`,
          row.id,
        ])
      );

      const optionRows = [];
      for (const item of snapshots) {
        if (!item.options.length) continue;
        const testQuestionId = createdByKey.get(
          `${item.questionId}:${item.sortOrder}`
        );
        if (!testQuestionId) continue;
        for (const opt of item.options) {
          optionRows.push({
            testQuestionId,
            text: opt.text,
            isCorrect: opt.isCorrect,
            sortOrder: opt.sortOrder,
          });
        }
      }

      if (optionRows.length) {
        await tx.testQuestionOption.createMany({ data: optionRows });
      }
    },
    {
      maxWait: 15_000,
      timeout: 60_000,
    }
  );

  return getTestById(id, userId);
};

const transitionTest = async (id, action, userId) => {
  const existing = await getTestById(id, userId);
  const code = existing.testStatus?.code;
  const now = new Date();

  if (action === 'finalize') {
    if (code !== 'DRAFT') {
      throw new AppError('Only draft papers can be finalized', 400);
    }
    if (!existing.questions?.length) {
      throw new AppError('Add at least one question before finalizing', 400);
    }

    const finalized = await getStatusByCode('FINALIZED');
    const questionIds = existing.questions
      .map((q) => q.questionId)
      .filter(Boolean);

    await prisma.$transaction(
      async (tx) => {
        await tx.test.update({
          where: { id },
          data: {
            testStatusId: finalized.id,
            generatedAt: now,
          },
        });

        if (questionIds.length) {
          await tx.question.updateMany({
            where: { id: { in: questionIds } },
            data: {
              lastUsedAt: now,
            },
          });

          // timesUsed needs per-row increment; batch in chunks
          for (let i = 0; i < questionIds.length; i += 25) {
            const chunk = questionIds.slice(i, i + 25);
            await Promise.all(
              chunk.map((questionId) =>
                tx.question.update({
                  where: { id: questionId },
                  data: { timesUsed: { increment: 1 } },
                })
              )
            );
          }
        }
      },
      {
        maxWait: 15_000,
        timeout: 60_000,
      }
    );

    return getTestById(id, userId);
  }

  if (action === 'publish') {
    if (code !== 'FINALIZED') {
      throw new AppError('Only finalized papers can be published', 400);
    }
    const published = await getStatusByCode('PUBLISHED');
    await prisma.test.update({
      where: { id },
      data: { testStatusId: published.id },
    });
    return getTestById(id, userId);
  }

  throw new AppError('Invalid action. Use finalize or publish', 400);
};

const updateTest = async (id, data, userId) => {
  const existing = await getTestById(id, userId);

  const touchesContent =
    data.title !== undefined ||
    data.description !== undefined ||
    data.instructions !== undefined ||
    data.testTypeId !== undefined ||
    data.durationMinutes !== undefined ||
    data.classId !== undefined ||
    data.subjectId !== undefined;

  if (touchesContent) {
    assertDraft(existing);
  }

  if (data.testTypeId) {
    const testType = await prisma.testType.findUnique({ where: { id: data.testTypeId } });
    if (!testType) throw new AppError('Test type not found', 404);
  }

  if (data.testStatusId) {
    throw new AppError('Use the transition endpoint to change paper status', 400);
  }

  await prisma.test.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.instructions !== undefined
        ? { instructions: data.instructions?.trim() || null }
        : {}),
      ...(data.testTypeId !== undefined ? { testTypeId: data.testTypeId } : {}),
      ...(data.classId !== undefined ? { classId: data.classId || null } : {}),
      ...(data.subjectId !== undefined ? { subjectId: data.subjectId || null } : {}),
      ...(data.durationMinutes !== undefined
        ? { durationMinutes: data.durationMinutes }
        : {}),
    },
  });

  return getTestById(id, userId);
};

const deleteTest = async (id, userId) => {
  await getTestById(id, userId);
  await prisma.test.delete({ where: { id } });
  return { id };
};

module.exports = {
  listTests,
  getTestById,
  generateTest,
  createManualTest,
  replaceTestQuestions,
  transitionTest,
  updateTest,
  deleteTest,
};
