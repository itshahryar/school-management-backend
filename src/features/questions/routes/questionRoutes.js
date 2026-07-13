const express = require('express');
const questionController = require('../controllers/questionController');
const {
  listQuestionsValidation,
  questionIdValidation,
  createQuestionValidation,
  bulkCreateQuestionsValidation,
  updateQuestionValidation,
} = require('../validations/questionValidation');
const { authenticate } = require('../../../middleware/auth');
const { adminOrHigher, requireActive } = require('../../../middleware/authorization');

const router = express.Router();

router.use(authenticate, requireActive, adminOrHigher);

router.get('/', listQuestionsValidation, questionController.listQuestions);
router.post('/', createQuestionValidation, questionController.createQuestion);
router.post(
  '/bulk',
  bulkCreateQuestionsValidation,
  questionController.bulkCreateQuestions
);
router.get('/:id', questionIdValidation, questionController.getQuestion);
router.patch('/:id', updateQuestionValidation, questionController.updateQuestion);
router.delete('/:id', questionIdValidation, questionController.deleteQuestion);

module.exports = router;
