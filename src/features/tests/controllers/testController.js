const testService = require('../services/testService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listTests = asyncHandler(async (req, res) => {
  const result = await testService.listTests(req.query, req.user.id);
  return success(res, { data: result });
});

const getTest = asyncHandler(async (req, res) => {
  const test = await testService.getTestById(req.params.id, req.user.id);
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

const createManualTest = asyncHandler(async (req, res) => {
  const test = await testService.createManualTest(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Draft question paper saved',
    data: { test },
  });
});

const replaceTestQuestions = asyncHandler(async (req, res) => {
  const test = await testService.replaceTestQuestions(
    req.params.id,
    req.body,
    req.user.id
  );
  return success(res, {
    message: 'Paper questions updated',
    data: { test },
  });
});

const transitionTest = asyncHandler(async (req, res) => {
  const test = await testService.transitionTest(
    req.params.id,
    req.body.action,
    req.user.id
  );
  return success(res, {
    message:
      req.body.action === 'publish'
        ? 'Question paper published'
        : 'Question paper finalized',
    data: { test },
  });
});

const updateTest = asyncHandler(async (req, res) => {
  const test = await testService.updateTest(
    req.params.id,
    req.body,
    req.user.id
  );
  return success(res, {
    message: 'Test updated successfully',
    data: { test },
  });
});

const deleteTest = asyncHandler(async (req, res) => {
  await testService.deleteTest(req.params.id, req.user.id);
  return success(res, { message: 'Test deleted successfully' });
});

module.exports = {
  listTests,
  getTest,
  generateTest,
  createManualTest,
  replaceTestQuestions,
  transitionTest,
  updateTest,
  deleteTest,
};
