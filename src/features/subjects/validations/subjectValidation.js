const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listSubjectsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('classId').optional().isUUID(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const subjectIdValidation = [idParam, validate];

const createSubjectValidation = [
  body('classId').isUUID().withMessage('classId is required'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const updateSubjectValidation = [
  idParam,
  body('classId').optional().isUUID(),
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listSubjectsValidation,
  subjectIdValidation,
  createSubjectValidation,
  updateSubjectValidation,
};
