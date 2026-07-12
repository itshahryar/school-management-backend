const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');
const { CONTENT_NODE_TYPES } = require('../../../constants/academic');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listContentNodesValidation = [
  query('subjectId').isUUID().withMessage('subjectId is required'),
  query('parentId').optional(),
  query('type').optional().isIn(CONTENT_NODE_TYPES),
  query('tree').optional().isIn(['true', 'false']),
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const contentNodeIdValidation = [idParam, validate];

const createContentNodeValidation = [
  body('subjectId').isUUID().withMessage('subjectId is required'),
  body('parentId').optional({ nullable: true }).isUUID(),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const updateContentNodeValidation = [
  idParam,
  body('parentId').optional({ nullable: true }),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('description').optional({ nullable: true }).trim().isLength({ max: 2000 }),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listContentNodesValidation,
  contentNodeIdValidation,
  createContentNodeValidation,
  updateContentNodeValidation,
};
