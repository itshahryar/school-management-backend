const {
  testTypeService,
  testStatusService,
  ensureDefaultTestMeta,
} = require('../services/testMetaService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listTestTypes = asyncHandler(async (req, res) => {
  await ensureDefaultTestMeta();
  const result = await testTypeService.list(req.query);
  return success(res, { data: { testTypes: result.items } });
});

const createTestType = asyncHandler(async (req, res) => {
  const testType = await testTypeService.create(req.body);
  return success(res, {
    statusCode: 201,
    message: 'Test type created successfully',
    data: { testType },
  });
});

const updateTestType = asyncHandler(async (req, res) => {
  const testType = await testTypeService.update(req.params.id, req.body);
  return success(res, {
    message: 'Test type updated successfully',
    data: { testType },
  });
});

const deleteTestType = asyncHandler(async (req, res) => {
  await testTypeService.remove(req.params.id);
  return success(res, { message: 'Test type deleted successfully' });
});

const listTestStatuses = asyncHandler(async (req, res) => {
  await ensureDefaultTestMeta();
  const result = await testStatusService.list(req.query);
  return success(res, { data: { testStatuses: result.items } });
});

const createTestStatus = asyncHandler(async (req, res) => {
  const testStatus = await testStatusService.create(req.body);
  return success(res, {
    statusCode: 201,
    message: 'Test status created successfully',
    data: { testStatus },
  });
});

const updateTestStatus = asyncHandler(async (req, res) => {
  const testStatus = await testStatusService.update(req.params.id, req.body);
  return success(res, {
    message: 'Test status updated successfully',
    data: { testStatus },
  });
});

const deleteTestStatus = asyncHandler(async (req, res) => {
  await testStatusService.remove(req.params.id);
  return success(res, { message: 'Test status deleted successfully' });
});

module.exports = {
  listTestTypes,
  createTestType,
  updateTestType,
  deleteTestType,
  listTestStatuses,
  createTestStatus,
  updateTestStatus,
  deleteTestStatus,
};
