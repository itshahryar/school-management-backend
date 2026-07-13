const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');
const { QUESTION_TYPES, DIFFICULTIES } = require('../../../constants/academic');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listTestsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().isLength({ max: 120 }),
  query('classId').optional().isUUID(),
  query('subjectId').optional().isUUID(),
  query('testTypeId').optional().isUUID(),
  query('testStatusId').optional().isUUID(),
  validate,
];

const testIdValidation = [idParam, validate];

const generateTestValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('instructions').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('classId').optional({ nullable: true }).isUUID(),
  body('subjectId').optional({ nullable: true }).isUUID(),
  body('testTypeId').isUUID().withMessage('testTypeId is required'),
  body('testStatusId').optional({ nullable: true }).isUUID(),
  body('durationMinutes').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('contentNodeIds')
    .isArray({ min: 1 })
    .withMessage('contentNodeIds must be a non-empty array'),
  body('contentNodeIds.*').isUUID(),
  body('rules').isArray({ min: 1 }).withMessage('rules must be a non-empty array'),
  body('rules.*.questionType').isIn(QUESTION_TYPES),
  body('rules.*.difficulty').isIn(DIFFICULTIES),
  body('rules.*.count').isInt({ min: 1 }).withMessage('rule count must be at least 1').toInt(),
  body('rules.*.marksEach').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('rules.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

const updateTestValidation = [
  idParam,
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('instructions').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('classId').optional({ nullable: true }).isUUID(),
  body('subjectId').optional({ nullable: true }).isUUID(),
  body('testTypeId').optional().isUUID(),
  body('durationMinutes').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  validate,
];

const createManualTestValidation = [
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('instructions').optional({ nullable: true }).trim().isLength({ max: 5000 }),
  body('classId').optional({ nullable: true }).isUUID(),
  body('subjectId').optional({ nullable: true }).isUUID(),
  body('testTypeId').isUUID().withMessage('testTypeId is required'),
  body('durationMinutes').optional({ nullable: true }).isInt({ min: 1 }).toInt(),
  body('questionIds').optional().isArray(),
  body('questionIds.*').optional().isUUID(),
  body('questions').optional().isArray({ min: 1 }),
  body('questions.*.questionId').optional().isUUID(),
  body('questions.*.id').optional().isUUID(),
  body('questions.*.marks').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('questions.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

const replaceQuestionsValidation = [
  idParam,
  body('questionIds').optional().isArray(),
  body('questionIds.*').optional().isUUID(),
  body('questions').optional().isArray({ min: 1 }),
  body('questions.*.questionId').optional().isUUID(),
  body('questions.*.id').optional().isUUID(),
  body('questions.*.marks').optional({ nullable: true }).isFloat({ gt: 0 }),
  body('questions.*.sortOrder').optional().isInt({ min: 0 }).toInt(),
  validate,
];

const transitionTestValidation = [
  idParam,
  body('action')
    .isIn(['finalize', 'publish'])
    .withMessage('action must be finalize or publish'),
  validate,
];

module.exports = {
  listTestsValidation,
  testIdValidation,
  generateTestValidation,
  updateTestValidation,
  createManualTestValidation,
  replaceQuestionsValidation,
  transitionTestValidation,
};
