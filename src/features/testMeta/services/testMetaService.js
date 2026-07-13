const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const { parseOptionalBoolean } = require('../../../utils/query');

const metaSelect = {
  id: true,
  name: true,
  code: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
};

const createMetaService = (modelName, label) => {
  const model = prisma[modelName];

  const list = async (query = {}) => {
    const where = {};
    const isActive = parseOptionalBoolean(query.isActive);
    if (typeof isActive === 'boolean') where.isActive = isActive;

    const items = await model.findMany({
      where,
      select: metaSelect,
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });

    return { items };
  };

  const getById = async (id) => {
    const item = await model.findUnique({ where: { id }, select: metaSelect });
    if (!item) throw new AppError(`${label} not found`, 404);
    return item;
  };

  const create = async (payload) => {
    const code = payload.code?.trim() || null;
    if (modelName === 'testStatus' && !code) {
      throw new AppError('code is required for test status', 400);
    }

    return model.create({
      data: {
        name: payload.name.trim(),
        code,
        description: payload.description?.trim() || null,
        sortOrder: payload.sortOrder ?? 0,
        isActive: payload.isActive ?? true,
      },
      select: metaSelect,
    });
  };

  const update = async (id, data) => {
    await getById(id);
    return model.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.code !== undefined ? { code: data.code?.trim() || null } : {}),
        ...(data.description !== undefined
          ? { description: data.description?.trim() || null }
          : {}),
        ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
      select: metaSelect,
    });
  };

  const remove = async (id) => {
    await getById(id);
    await model.delete({ where: { id } });
    return { id };
  };

  return { list, getById, create, update, remove };
};

const testTypeService = createMetaService('testType', 'Test type');
const testStatusService = createMetaService('testStatus', 'Test status');

/** Ensure default statuses/types exist for paper generation. */
const ensureDefaultTestMeta = async () => {
  const defaultTypes = [
    { name: 'Unit Test', code: 'UNIT', sortOrder: 1 },
    { name: 'Midterm', code: 'MIDTERM', sortOrder: 2 },
    { name: 'Final', code: 'FINAL', sortOrder: 3 },
    { name: 'Practice', code: 'PRACTICE', sortOrder: 4 },
  ];

  const defaultStatuses = [
    { name: 'Draft', code: 'DRAFT', sortOrder: 1 },
    { name: 'Finalized', code: 'FINALIZED', sortOrder: 2 },
    { name: 'Published', code: 'PUBLISHED', sortOrder: 3 },
    { name: 'Archived', code: 'ARCHIVED', sortOrder: 4 },
  ];

  for (const item of defaultTypes) {
    const byCode = await prisma.testType.findUnique({ where: { code: item.code } });
    if (byCode) {
      await prisma.testType.update({
        where: { id: byCode.id },
        data: { name: item.name, sortOrder: item.sortOrder, isActive: true },
      });
      continue;
    }
    const byName = await prisma.testType.findUnique({ where: { name: item.name } });
    if (byName) {
      await prisma.testType.update({
        where: { id: byName.id },
        data: { code: item.code, sortOrder: item.sortOrder, isActive: true },
      });
    } else {
      await prisma.testType.create({ data: item });
    }
  }

  for (const item of defaultStatuses) {
    const byCode = await prisma.testStatus.findUnique({ where: { code: item.code } });
    if (byCode) {
      await prisma.testStatus.update({
        where: { id: byCode.id },
        data: { name: item.name, sortOrder: item.sortOrder, isActive: true },
      });
      continue;
    }
    const byName = await prisma.testStatus.findUnique({ where: { name: item.name } });
    if (byName) {
      await prisma.testStatus.update({
        where: { id: byName.id },
        data: { code: item.code, sortOrder: item.sortOrder, isActive: true },
      });
    } else {
      await prisma.testStatus.create({ data: item });
    }
  }
};

const getStatusByCode = async (code) => {
  await ensureDefaultTestMeta();
  const status = await prisma.testStatus.findUnique({ where: { code } });
  if (!status) throw new AppError(`Test status ${code} is missing`, 500);
  return status;
};

module.exports = {
  testTypeService,
  testStatusService,
  ensureDefaultTestMeta,
  getStatusByCode,
};
