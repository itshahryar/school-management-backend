const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const { ContentNodeType } = require('../../../constants/academic');
const { parseOptionalBoolean } = require('../../../utils/query');

const nodeSelect = {
  id: true,
  subjectId: true,
  parentId: true,
  type: true,
  title: true,
  description: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  _count: {
    select: {
      children: true,
      questions: true,
      notes: true,
    },
  },
};

const ensureSubjectExists = async (subjectId) => {
  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true },
  });
  if (!subject) throw new AppError('Subject not found', 404);
};

const getNodeById = async (id) => {
  const node = await prisma.contentNode.findUnique({
    where: { id },
    select: nodeSelect,
  });
  if (!node) throw new AppError('Content node not found', 404);
  return node;
};

/**
 * Collect this node id plus all descendant ids (BFS).
 */
const collectDescendantIds = async (rootIds) => {
  const ids = new Set(rootIds);
  let frontier = [...rootIds];

  while (frontier.length) {
    const children = await prisma.contentNode.findMany({
      where: { parentId: { in: frontier } },
      select: { id: true },
    });
    frontier = [];
    for (const child of children) {
      if (!ids.has(child.id)) {
        ids.add(child.id);
        frontier.push(child.id);
      }
    }
  }

  return [...ids];
};

/**
 * Build breadcrumb path titles for a node.
 */
const buildSourcePath = async (nodeId) => {
  const titles = [];
  let currentId = nodeId;

  while (currentId) {
    const node = await prisma.contentNode.findUnique({
      where: { id: currentId },
      select: { title: true, parentId: true },
    });
    if (!node) break;
    titles.unshift(node.title);
    currentId = node.parentId;
  }

  return titles.join(' > ');
};

const buildTree = (nodes, parentId = null) =>
  nodes
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((node) => ({
      ...node,
      children: buildTree(nodes, node.id),
    }));

/**
 * Each node's _count.questions becomes the subtree total (self + descendants).
 * directQuestions keeps the count attached only to that node.
 */
const withSubtreeQuestionCounts = (node) => {
  const children = (node.children || []).map(withSubtreeQuestionCounts);
  const nestedTotal = children.reduce(
    (sum, child) => sum + (child._count?.questions ?? 0),
    0
  );
  const directQuestions = node._count?.questions ?? 0;

  return {
    ...node,
    children,
    _count: {
      ...node._count,
      directQuestions,
      questions: directQuestions + nestedTotal,
    },
  };
};

const listContentNodes = async (query = {}) => {
  if (!query.subjectId) {
    throw new AppError('subjectId query parameter is required', 400);
  }

  await ensureSubjectExists(query.subjectId);

  const where = { subjectId: query.subjectId };

  if (query.parentId === 'null' || query.parentId === '') {
    where.parentId = null;
  } else if (query.parentId) {
    where.parentId = query.parentId;
  }

  if (query.type) where.type = query.type;

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const nodes = await prisma.contentNode.findMany({
    where,
    select: nodeSelect,
    orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
  });

  if (query.tree === 'true' || query.tree === true) {
    const allNodes = await prisma.contentNode.findMany({
      where: {
        subjectId: query.subjectId,
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
      },
      select: nodeSelect,
      orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }],
    });
    return {
      nodes: buildTree(allNodes).map(withSubtreeQuestionCounts),
    };
  }

  return { nodes };
};

const createContentNode = async (payload, createdById) => {
  const { subjectId, parentId, title, description, isActive } = payload;

  await ensureSubjectExists(subjectId);

  const resolvedParentId = parentId || null;
  let type = ContentNodeType.CHAPTER;

  if (resolvedParentId) {
    const parent = await getNodeById(resolvedParentId);
    if (parent.subjectId !== subjectId) {
      throw new AppError('Parent node must belong to the same subject', 400);
    }
    type = ContentNodeType.SECTION;
  }

  const siblingAgg = await prisma.contentNode.aggregate({
    where: {
      subjectId,
      parentId: resolvedParentId,
    },
    _max: { sortOrder: true },
  });
  const sortOrder = (siblingAgg._max.sortOrder ?? -1) + 1;

  return prisma.contentNode.create({
    data: {
      subjectId,
      parentId: resolvedParentId,
      type,
      title: title.trim(),
      description: description?.trim() || null,
      sortOrder,
      isActive: isActive ?? true,
      createdById,
    },
    select: nodeSelect,
  });
};

const updateContentNode = async (id, data) => {
  const existing = await getNodeById(id);

  if (data.parentId !== undefined) {
    if (data.parentId === null || data.parentId === '') {
      // Moving to chapter level
    } else {
      if (data.parentId === id) {
        throw new AppError('A node cannot be its own parent', 400);
      }
      const parent = await getNodeById(data.parentId);
      if (parent.subjectId !== existing.subjectId) {
        throw new AppError('Parent node must belong to the same subject', 400);
      }
      const descendants = await collectDescendantIds([id]);
      if (descendants.includes(data.parentId)) {
        throw new AppError('Cannot move a node under its own descendant', 400);
      }
    }
  }

  const nextParentId =
    data.parentId === undefined
      ? existing.parentId
      : data.parentId || null;

  return prisma.contentNode.update({
    where: { id },
    data: {
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.description !== undefined
        ? { description: data.description?.trim() || null }
        : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      ...(data.parentId !== undefined
        ? {
            parentId: nextParentId,
            type: nextParentId ? ContentNodeType.SECTION : ContentNodeType.CHAPTER,
          }
        : {}),
    },
    select: nodeSelect,
  });
};

const deleteContentNode = async (id) => {
  await getNodeById(id);
  await prisma.contentNode.delete({ where: { id } });
  return { id };
};

module.exports = {
  listContentNodes,
  getNodeById,
  createContentNode,
  updateContentNode,
  deleteContentNode,
  collectDescendantIds,
  buildSourcePath,
};
