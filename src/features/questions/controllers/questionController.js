const questionService = require('../services/questionService');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const listQuestions = asyncHandler(async (req, res) => {
  const result = await questionService.listQuestions(req.query);
  return success(res, { data: result });
});

const getQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.getQuestionById(req.params.id);
  return success(res, { data: { question } });
});

const createQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.createQuestion(req.body, req.user.id);
  return success(res, {
    statusCode: 201,
    message: 'Question created successfully',
    data: { question },
  });
});

const bulkCreateQuestions = asyncHandler(async (req, res) => {
  const result = await questionService.bulkCreateQuestions(
    req.body,
    req.user.id
  );
  return success(res, {
    statusCode: 201,
    message: `${result.count} questions imported successfully`,
    data: result,
  });
});

const updateQuestion = asyncHandler(async (req, res) => {
  const question = await questionService.updateQuestion(req.params.id, req.body);
  return success(res, {
    message: 'Question updated successfully',
    data: { question },
  });
});

const deleteQuestion = asyncHandler(async (req, res) => {
  await questionService.deleteQuestion(req.params.id);
  return success(res, { message: 'Question deleted successfully' });
});

module.exports = {
  listQuestions,
  getQuestion,
  createQuestion,
  bulkCreateQuestions,
  updateQuestion,
  deleteQuestion,
};
