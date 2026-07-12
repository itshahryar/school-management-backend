const testService = require('../services/testService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listTests = asyncHandler(async (req, res) => {
  const result = await testService.listTests(req.query);
  return success(res, { data: result });
});

const getTest = asyncHandler(async (req, res) => {
  const test = await testService.getTestById(req.params.id);
  return success(res, { data: { test } });
});

const generateTest = asyncHandler(async (req, res) => {
  const test = await testService.generateTest(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Question paper generated successfully',
    data: { test },
  });
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await testService.updateTest(req.params.id, req.body);
  return success(res, {
    message: 'Test updated successfully',
    data: { test },
  });
});

const deleteTest = asyncHandler(async (req, res) => {
  await testService.deleteTest(req.params.id);
  return success(res, { message: 'Test deleted successfully' });
});

module.exports = {
  listTests,
  getTest,
  generateTest,
  updateTest,
  deleteTest,
};
