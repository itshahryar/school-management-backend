const noteService = require('../services/noteService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listNotes = asyncHandler(async (req, res) => {
  const result = await noteService.listNotes(req.query);
  return success(res, { data: result });
});

const getNote = asyncHandler(async (req, res) => {
  const note = await noteService.getNoteById(req.params.id);
  return success(res, { data: { note } });
});

const createNote = asyncHandler(async (req, res) => {
  const note = await noteService.createNote(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Note created successfully',
    data: { note },
  });
});

const updateNote = asyncHandler(async (req, res) => {
  const note = await noteService.updateNote(req.params.id, req.body);
  return success(res, {
    message: 'Note updated successfully',
    data: { note },
  });
});

const deleteNote = asyncHandler(async (req, res) => {
  await noteService.deleteNote(req.params.id);
  return success(res, { message: 'Note deleted successfully' });
});

module.exports = {
  listNotes,
  getNote,
  createNote,
  updateNote,
  deleteNote,
};
