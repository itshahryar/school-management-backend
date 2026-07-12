const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
} = require('../../../utils/query');

const subjectSelect = {
  id: true,
  classId: true,
  name: true,
  code: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  class: { select: { id: true, name: true } },
  _count: { select: { nodes: true } },
};

const ensureClassExists = async (classId) => {
  const classRecord = await prisma.class.findUnique({
    where: { id: classId },
    select: { id: true },
  });
  if (!classRecord) throw new AppError('Class not found', 404);
};

const listSubjects = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.classId) where.classId = query.classId;

  if (query.search?.trim()) {
    where.OR = [
      { name: { contains: query.search.trim(), mode: 'insensitive' } },
      { code: { contains: query.search.trim(), mode: 'insensitive' } },
    ];
  }

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const [subjects, total] = await Promise.all([
    prisma.subject.findMany({
      where,
      select: subjectSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.subject.count({ where }),
  ]);

  return {
    subjects,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getSubjectById = async (id) => {
  const subject = await prisma.subject.findUnique({
    where: { id },
    select: subjectSelect,
  });
  if (!subject) throw new AppError('Subject not found', 404);
  return subject;
};

const createSubject = async (
  { classId, name, code, description, sortOrder, isActive },
  createdById
) => {
  await ensureClassExists(classId);

  return prisma.subject.create({
    data: {
      classId,
      name: name.trim(),
      code: code?.trim() || null,
      description: description?.trim() || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdById,
    },
    select: subjectSelect,
  });
};

const updateSubject = async (id, data) => {
  await getSubjectById(id);

  if (data.classId) await ensureClassExists(data.classId);

  return prisma.subject.update({
    where: { id },
    data: {
      ...(data.classId !== undefined ? { classId: data.classId } : {}),
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.code !== undefined ? { code: data.code?.trim() || null } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: subjectSelect,
  });
};

const deleteSubject = async (id) => {
  await getSubjectById(id);
  await prisma.subject.delete({ where: { id } });
  return { id };
};

module.exports = {
  listSubjects,
  getSubjectById,
  createSubject,
  updateSubject,
  deleteSubject,
};
