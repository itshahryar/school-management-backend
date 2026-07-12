const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const { ContentNodeType } = require('../../../constants/academic');
const {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
} = require('../../../utils/query');

const noteSelect = {
  id: true,
  contentNodeId: true,
  title: true,
  fileUrl: true,
  fileName: true,
  mimeType: true,
  fileSizeBytes: true,
  sortOrder: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  contentNode: {
    select: { id: true, title: true, type: true, subjectId: true },
  },
};

const ensureChapterNode = async (contentNodeId) => {
  const node = await prisma.contentNode.findUnique({
    where: { id: contentNodeId },
    select: { id: true, type: true, title: true },
  });

  if (!node) throw new AppError('Content node not found', 404);
  if (node.type !== ContentNodeType.CHAPTER) {
    throw new AppError('Notes can only be attached to chapters', 400);
  }

  return node;
};

const listNotes = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.contentNodeId) where.contentNodeId = query.contentNodeId;
  if (query.subjectId) {
    where.contentNode = { subjectId: query.subjectId, type: ContentNodeType.CHAPTER };
  }

  if (query.search?.trim()) {
    where.title = { contains: query.search.trim(), mode: 'insensitive' };
  }

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const [notes, total] = await Promise.all([
    prisma.note.findMany({
      where,
      select: noteSelect,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      skip,
      take: limit,
    }),
    prisma.note.count({ where }),
  ]);

  return { notes, pagination: buildPaginationMeta(total, page, limit) };
};

const getNoteById = async (id) => {
  const note = await prisma.note.findUnique({
    where: { id },
    select: noteSelect,
  });
  if (!note) throw new AppError('Note not found', 404);
  return note;
};

const createNote = async (payload, createdById) => {
  await ensureChapterNode(payload.contentNodeId);

  return prisma.note.create({
    data: {
      contentNodeId: payload.contentNodeId,
      title: payload.title.trim(),
      fileUrl: payload.fileUrl.trim(),
      fileName: payload.fileName.trim(),
      mimeType: payload.mimeType?.trim() || 'application/pdf',
      fileSizeBytes: payload.fileSizeBytes ?? null,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
      createdById,
    },
    select: noteSelect,
  });
};

const updateNote = async (id, data) => {
  await getNoteById(id);

  if (data.contentNodeId) await ensureChapterNode(data.contentNodeId);

  return prisma.note.update({
    where: { id },
    data: {
      ...(data.contentNodeId !== undefined ? { contentNodeId: data.contentNodeId } : {}),
      ...(data.title !== undefined ? { title: data.title.trim() } : {}),
      ...(data.fileUrl !== undefined ? { fileUrl: data.fileUrl.trim() } : {}),
      ...(data.fileName !== undefined ? { fileName: data.fileName.trim() } : {}),
      ...(data.mimeType !== undefined ? { mimeType: data.mimeType.trim() } : {}),
      ...(data.fileSizeBytes !== undefined ? { fileSizeBytes: data.fileSizeBytes } : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
    select: noteSelect,
  });
};

const deleteNote = async (id) => {
  await getNoteById(id);
  await prisma.note.delete({ where: { id } });
  return { id };
};

module.exports = {
  listNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
};
