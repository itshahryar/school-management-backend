const classService = require('../services/classService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listClasses = asyncHandler(async (req, res) => {
  const result = await classService.listClasses(req.query);
  return success(res, { data: result });
});

const getClass = asyncHandler(async (req, res) => {
  const classRecord = await classService.getClassById(req.params.id);
  return success(res, { data: { class: classRecord } });
});

const createClass = asyncHandler(async (req, res) => {
  const classRecord = await classService.createClass(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Class created successfully',
    data: { class: classRecord },
  });
});

const updateClass = asyncHandler(async (req, res) => {
  const classRecord = await classService.updateClass(req.params.id, req.body);
  return success(res, {
    message: 'Class updated successfully',
    data: { class: classRecord },
  });
});

const deleteClass = asyncHandler(async (req, res) => {
  await classService.deleteClass(req.params.id);
  return success(res, { message: 'Class deleted successfully' });
});

module.exports = {
  listClasses,
  getClass,
  createClass,
  updateClass,
  deleteClass,
};
