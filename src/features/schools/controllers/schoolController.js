const schoolService = require('../services/schoolService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listSchools = asyncHandler(async (req, res) => {
  const result = await schoolService.listSchools(req.query);
  return success(res, { data: result });
});

const getSchool = asyncHandler(async (req, res) => {
  const school = await schoolService.getSchoolById(req.params.id);
  return success(res, { data: { school } });
});

const createSchool = asyncHandler(async (req, res) => {
  const school = await schoolService.createSchool(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'School created successfully',
    data: { school },
  });
});

const updateSchool = asyncHandler(async (req, res) => {
  const school = await schoolService.updateSchool(req.params.id, req.body);
  return success(res, {
    message: 'School updated successfully',
    data: { school },
  });
});

const deleteSchool = asyncHandler(async (req, res) => {
  await schoolService.deleteSchool(req.params.id);
  return success(res, { message: 'School deleted successfully' });
});

const getMySchools = asyncHandler(async (req, res) => {
  const result = await schoolService.getMySchools(req.user.id);
  return success(res, { data: result });
});

const getSchoolCurriculum = asyncHandler(async (req, res) => {
  const curriculum = await schoolService.getSchoolCurriculum(
    req.params.id,
    req.user.id,
    req.user.role
  );
  return success(res, { data: curriculum });
});

module.exports = {
  listSchools,
  getSchool,
  createSchool,
  updateSchool,
  deleteSchool,
  getMySchools,
  getSchoolCurriculum,
};
