const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listClassesValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const classIdValidation = [idParam, validate];

const createClassValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const updateClassValidation = [
  idParam,
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 1000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listClassesValidation,
  classIdValidation,
  createClassValidation,
  updateClassValidation,
};
