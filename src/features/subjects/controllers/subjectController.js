const subjectService = require('../services/subjectService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listSubjects = asyncHandler(async (req, res) => {
  const result = await subjectService.listSubjects(req.query);
  return success(res, { data: result });
});

const getSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.getSubjectById(req.params.id);
  return success(res, { data: { subject } });
});

const createSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.createSubject(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Subject created successfully',
    data: { subject },
  });
});

const updateSubject = asyncHandler(async (req, res) => {
  const subject = await subjectService.updateSubject(req.params.id, req.body);
  return success(res, {
    message: 'Subject updated successfully',
    data: { subject },
  });
});

const deleteSubject = asyncHandler(async (req, res) => {
  await subjectService.deleteSubject(req.params.id);
  return success(res, { message: 'Subject deleted successfully' });
});

module.exports = {
  listSubjects,
  getSubject,
  createSubject,
  updateSubject,
  deleteSubject,
};
