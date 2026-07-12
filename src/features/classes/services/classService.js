const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
} = require('../../../utils/query');

const classSelect = {
  id: true,
  name: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  _count: { select: { subjects: true } },
};

const listClasses = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.search?.trim()) {
    where.name = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const [classes, total] = await Promise.all([
    prisma.class.findMany({
      where,
      select: classSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.class.count({ where }),
  ]);

  return {
    classes,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getClassById = async (id) => {
  const classRecord = await prisma.class.findUnique({
    where: { id },
    select: {
      ...classSelect,
      subjects: {
        select: {
          id: true,
          name: true,
          code: true,
          sortOrder: true,
          isActive: true,
        },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      },
    },
  });

  if (!classRecord) throw new AppError('Class not found', 404);
  return classRecord;
};

const createClass = async ({ name, description, sortOrder, isActive }, createdById) => {
  return prisma.class.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      sortOrder: sortOrder ?? 0,
      isActive: isActive ?? true,
      createdById,
    },
    select: classSelect,
  });
};

const updateClass = async (id, data) => {
  await getClassById(id);

  return prisma.class.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: classSelect,
  });
};

const deleteClass = async (id) => {
  await getClassById(id);
  await prisma.class.delete({ where: { id } });
  return { id };
};

module.exports = {
  listClasses,
  getClassById,
  createClass,
  updateClass,
  deleteClass,
};
