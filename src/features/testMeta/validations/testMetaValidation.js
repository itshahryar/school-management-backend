const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listMetaValidation = [
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const createMetaValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 120 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const updateMetaValidation = [
  idParam,
  body('name').optional().trim().notEmpty().isLength({ max: 120 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 40 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const metaIdValidation = [idParam, validate];

module.exports = {
  listMetaValidation,
  createMetaValidation,
  updateMetaValidation,
  metaIdValidation,
};
