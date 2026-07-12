const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');
const { QUESTION_TYPES, DIFFICULTIES } = require('../../../constants/academic');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listQuestionsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('contentNodeId').optional().isUUID(),
  query('subjectId').optional().isUUID(),
  query('type').optional().isIn(QUESTION_TYPES),
  query('difficulty').optional().isIn(DIFFICULTIES),
  query('search').optional().trim().isLength({ max: 200 }),
  query('isActive').optional().isIn(['true', 'false']),
  query('sort')
    .optional()
    .isIn(['latest', 'oldest', 'marks_asc', 'marks_desc'])
    .withMessage('Invalid sort option'),
  validate,
];

const questionIdValidation = [idParam, validate];

const optionRules = body('options')
  .optional()
  .isArray()
  .withMessage('options must be an array');

const createQuestionValidation = [
  body('contentNodeId').isUUID().withMessage('contentNodeId is required'),
  body('type').isIn(QUESTION_TYPES).withMessage('Invalid question type'),
  body('difficulty').isIn(DIFFICULTIES).withMessage('Invalid difficulty'),
  body('text').trim().notEmpty().withMessage('Question text is required'),
  body('marks').isFloat({ gt: 0 }).withMessage('marks must be greater than 0'),
  body('allowMultipleCorrect').optional().isBoolean().toBoolean(),
  body('explanation').optional({ nullable: true }).trim(),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  optionRules,
  body('options.*.text').optional().trim().notEmpty(),
  body('options.*.isCorrect').optional().isBoolean(),
  body('options.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

const bulkCreateQuestionsValidation = [
  body('contentNodeId').isUUID().withMessage('contentNodeId is required'),
  body('questions')
    .isArray({ min: 1, max: 100 })
    .withMessage('Provide 1–100 questions'),
  body('questions.*.type')
    .isIn(QUESTION_TYPES)
    .withMessage('Invalid question type'),
  body('questions.*.difficulty')
    .isIn(DIFFICULTIES)
    .withMessage('Invalid difficulty'),
  body('questions.*.text')
    .trim()
    .notEmpty()
    .withMessage('Question text is required'),
  body('questions.*.marks')
    .isFloat({ gt: 0 })
    .withMessage('marks must be greater than 0'),
  body('questions.*.allowMultipleCorrect').optional().isBoolean().toBoolean(),
  body('questions.*.explanation').optional({ nullable: true }).trim(),
  body('questions.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('questions.*.isActive').optional().isBoolean().toBoolean(),
  body('questions.*.options').optional().isArray(),
  body('questions.*.options.*.text').optional().trim().notEmpty(),
  body('questions.*.options.*.isCorrect').optional().isBoolean(),
  body('questions.*.options.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

const updateQuestionValidation = [
  idParam,
  body('contentNodeId').optional().isUUID(),
  body('type').optional().isIn(QUESTION_TYPES),
  body('difficulty').optional().isIn(DIFFICULTIES),
  body('text').optional().trim().notEmpty(),
  body('marks').optional().isFloat({ gt: 0 }),
  body('allowMultipleCorrect').optional().isBoolean().toBoolean(),
  body('explanation').optional({ nullable: true }).trim(),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  optionRules,
  body('options.*.text').optional().trim().notEmpty(),
  body('options.*.isCorrect').optional().isBoolean(),
  body('options.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

module.exports = {
  listQuestionsValidation,
  questionIdValidation,
  createQuestionValidation,
  bulkCreateQuestionsValidation,
  updateQuestionValidation,
};
