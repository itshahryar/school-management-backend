const { Prisma } = require('@prisma/client');
const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const {
  ContentNodeType,
  QuestionType,
} = require('../../../constants/academic');
const {
  collectDescendantIds,
} = require('../../contentNodes/services/contentNodeService');
const {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
} = require('../../../utils/query');

const optionSelect = {
  id: true,
  text: true,
  isCorrect: true,
  sortOrder: true,
};

const questionSelect = {
  id: true,
  contentNodeId: true,
  type: true,
  difficulty: true,
  text: true,
  marks: true,
  allowMultipleCorrect: true,
  explanation: true,
  sortOrder: true,
  isActive: true,
  timesUsed: true,
  lastUsedAt: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  contentNode: {
    select: { id: true, title: true, type: true, subjectId: true },
  },
  options: {
    select: optionSelect,
    orderBy: { sortOrder: 'asc' },
  },
};

const ensureContentNode = async (contentNodeId) => {
  const node = await prisma.contentNode.findUnique({
    where: { id: contentNodeId },
    select: { id: true, type: true, title: true },
  });
  if (!node) throw new AppError('Content node not found', 404);
  return node;
};

/** Questions may only live on topics / sub-topics (SECTION), not chapters. */
const ensureQuestionableContentNode = async (contentNodeId) => {
  const node = await ensureContentNode(contentNodeId);
  if (node.type === ContentNodeType.CHAPTER) {
    throw new AppError(
      'Questions can only be added to topics and sub-topics, not chapters',
      400
    );
  }
  return node;
};

const resolveContentNodeFilter = async (contentNodeId) => {
  const node = await ensureContentNode(contentNodeId);

  if (node.type === ContentNodeType.CHAPTER) {
    const ids = await collectDescendantIds([node.id]);
    if (!ids.length) {
      return { contentNodeId: { in: [] } };
    }
    // Include the chapter id so any legacy questions still appear in the total.
    return { contentNodeId: { in: ids } };
  }

  return { contentNodeId: node.id };
};

const nextSortOrderForNode = async (contentNodeId, tx = prisma) => {
  const agg = await tx.question.aggregate({
    where: { contentNodeId },
    _max: { sortOrder: true },
  });
  return (agg._max.sortOrder ?? -1) + 1;
};

const resolveListOrderBy = (sort) => {
  switch (String(sort || 'latest').toLowerCase()) {
    case 'oldest':
      return [{ createdAt: 'asc' }, { id: 'asc' }];
    case 'marks_asc':
      return [{ marks: 'asc' }, { createdAt: 'desc' }];
    case 'marks_desc':
      return [{ marks: 'desc' }, { createdAt: 'desc' }];
    case 'latest':
    default:
      return [{ createdAt: 'desc' }, { id: 'desc' }];
  }
};

const validateMcqOptions = (type, options, allowMultipleCorrect) => {
  if (type !== QuestionType.MCQ) {
    if (options?.length) {
      throw new AppError('Options are only allowed for MCQ questions', 400);
    }
    return [];
  }

  if (!Array.isArray(options) || options.length < 2) {
    throw new AppError('MCQ questions require at least 2 options', 400);
  }

  const correctCount = options.filter((opt) => opt.isCorrect).length;
  if (correctCount < 1) {
    throw new AppError('MCQ questions require at least one correct option', 400);
  }

  if (!allowMultipleCorrect && correctCount > 1) {
    throw new AppError(
      'Single-answer MCQs can have only one correct option. Set allowMultipleCorrect to true for multiple.',
      400
    );
  }

  return options.map((opt, index) => ({
    text: String(opt.text).trim(),
    isCorrect: Boolean(opt.isCorrect),
    sortOrder: opt.sortOrder ?? index,
  }));
};

const listQuestions = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.contentNodeId) {
    const nodeFilter = await resolveContentNodeFilter(query.contentNodeId);
    if (
      nodeFilter.contentNodeId?.in &&
      nodeFilter.contentNodeId.in.length === 0
    ) {
      return {
        questions: [],
        pagination: buildPaginationMeta(0, page, limit),
      };
    }
    Object.assign(where, nodeFilter);
  }
  if (query.subjectId) where.contentNode = { subjectId: query.subjectId };
  if (query.type) where.type = query.type;
  if (query.difficulty) where.difficulty = query.difficulty;

  if (query.search?.trim()) {
    where.text = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const orderBy = resolveListOrderBy(query.sort);

  const [questions, total] = await Promise.all([
    prisma.question.findMany({
      where,
      select: questionSelect,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.question.count({ where }),
  ]);

  return { questions, pagination: buildPaginationMeta(total, page, limit) };
};

const getQuestionById = async (id) => {
  const question = await prisma.question.findUnique({
    where: { id },
    select: questionSelect,
  });
  if (!question) throw new AppError('Question not found', 404);
  return question;
};

const createQuestion = async (payload, createdById) => {
  await ensureQuestionableContentNode(payload.contentNodeId);

  const type = payload.type;
  const allowMultipleCorrect =
    type === QuestionType.MCQ ? Boolean(payload.allowMultipleCorrect) : false;
  const options = validateMcqOptions(type, payload.options, allowMultipleCorrect);
  const sortOrder = await nextSortOrderForNode(payload.contentNodeId);

  return prisma.question.create({
    data: {
      contentNodeId: payload.contentNodeId,
      type,
      difficulty: payload.difficulty,
      text: payload.text.trim(),
      marks: new Prisma.Decimal(payload.marks),
      allowMultipleCorrect,
      explanation: payload.explanation?.trim() || null,
      sortOrder,
      isActive: payload.isActive ?? true,
      createdById,
      ...(options.length
        ? {
            options: {
              create: options,
            },
          }
        : {}),
    },
    select: questionSelect,
  });
};

const bulkCreateQuestions = async (
  { contentNodeId, questions },
  createdById
) => {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new AppError('Provide at least one question', 400);
  }

  if (questions.length > 100) {
    throw new AppError('You can import at most 100 questions at once', 400);
  }

  await ensureQuestionableContentNode(contentNodeId);

  const prepared = questions.map((item, index) => {
    const type = item.type;
    const allowMultipleCorrect =
      type === QuestionType.MCQ ? Boolean(item.allowMultipleCorrect) : false;
    const options = validateMcqOptions(type, item.options, allowMultipleCorrect);

    if (!item.text?.trim()) {
      throw new AppError(`Question #${index + 1} is missing text`, 400);
    }

    return {
      contentNodeId,
      type,
      difficulty: item.difficulty,
      text: item.text.trim(),
      marks: new Prisma.Decimal(item.marks),
      allowMultipleCorrect,
      explanation: item.explanation?.trim() || null,
      isActive: item.isActive ?? true,
      createdById,
      options,
    };
  });

  const created = await prisma.$transaction(
    async (tx) => {
      let nextOrder = await nextSortOrderForNode(contentNodeId, tx);
      const results = [];

      for (const item of prepared) {
        const question = await tx.question.create({
          data: {
            contentNodeId: item.contentNodeId,
            type: item.type,
            difficulty: item.difficulty,
            text: item.text,
            marks: item.marks,
            allowMultipleCorrect: item.allowMultipleCorrect,
            explanation: item.explanation,
            sortOrder: nextOrder,
            isActive: item.isActive,
            createdById: item.createdById,
            ...(item.options.length
              ? { options: { create: item.options } }
              : {}),
          },
          select: questionSelect,
        });
        nextOrder += 1;
        results.push(question);
      }

      return results;
    },
    {
      maxWait: 15_000,
      timeout: 120_000,
    }
  );

  return { questions: created, count: created.length };
};

const updateQuestion = async (id, data) => {
  const existing = await getQuestionById(id);

  if (data.contentNodeId) await ensureQuestionableContentNode(data.contentNodeId);

  const nextType = data.type ?? existing.type;
  const nextAllowMultiple =
    nextType === QuestionType.MCQ
      ? data.allowMultipleCorrect !== undefined
        ? Boolean(data.allowMultipleCorrect)
        : existing.allowMultipleCorrect
      : false;

  const shouldReplaceOptions = Array.isArray(data.options);
  const options = shouldReplaceOptions
    ? validateMcqOptions(nextType, data.options, nextAllowMultiple)
    : null;

  if (nextType !== QuestionType.MCQ && existing.options.length && !shouldReplaceOptions) {
    // Clear options when converting away from MCQ
  }

  return prisma.$transaction(async (tx) => {
    if (shouldReplaceOptions || nextType !== QuestionType.MCQ) {
      await tx.mcqOption.deleteMany({ where: { questionId: id } });
    }

    if (shouldReplaceOptions && options.length) {
      await tx.mcqOption.createMany({
        data: options.map((opt) => ({ ...opt, questionId: id })),
      });
    }

    return tx.question.update({
      where: { id },
      data: {
        ...(data.contentNodeId !== undefined ? { contentNodeId: data.contentNodeId } : {}),
        ...(data.type !== undefined ? { type: data.type } : {}),
        ...(data.difficulty !== undefined ? { difficulty: data.difficulty } : {}),
        ...(data.text !== undefined ? { text: data.text.trim() } : {}),
        ...(data.marks !== undefined ? { marks: new Prisma.Decimal(data.marks) } : {}),
        allowMultipleCorrect: nextAllowMultiple,
        ...(data.explanation !== undefined
          ? { explanation: data.explanation?.trim() || null }
          : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: questionSelect,
    });
  });
};

const deleteQuestion = async (id) => {
  await getQuestionById(id);
  await prisma.question.delete({ where: { id } });
  return { id };
};

module.exports = {
  listQuestions,
  getQuestionById,
  createQuestion,
  bulkCreateQuestions,
  updateQuestion,
  deleteQuestion,
  questionSelect,
};
