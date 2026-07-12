const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');

const idParam = param('id').isUUID().withMessage('Invalid id');

const listNotesValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('contentNodeId').optional().isUUID(),
  query('subjectId').optional().isUUID(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const noteIdValidation = [idParam, validate];

const createNoteValidation = [
  body('contentNodeId').isUUID().withMessage('contentNodeId is required'),
  body('title').trim().notEmpty().withMessage('Title is required').isLength({ max: 200 }),
  body('fileUrl').trim().notEmpty().withMessage('fileUrl is required').isLength({ max: 2000 }),
  body('fileName').trim().notEmpty().withMessage('fileName is required').isLength({ max: 255 }),
  body('mimeType').optional().trim().isLength({ max: 120 }),
  body('fileSizeBytes').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

const updateNoteValidation = [
  idParam,
  body('contentNodeId').optional().isUUID(),
  body('title').optional().trim().notEmpty().isLength({ max: 200 }),
  body('fileUrl').optional().trim().notEmpty().isLength({ max: 2000 }),
  body('fileName').optional().trim().notEmpty().isLength({ max: 255 }),
  body('mimeType').optional().trim().isLength({ max: 120 }),
  body('fileSizeBytes').optional({ nullable: true }).isInt({ min: 0 }).toInt(),
  body('sortOrder').optional().isInt({ min: 0 }).toInt(),
  body('isActive').optional().isBoolean().toBoolean(),
  validate,
];

module.exports = {
  listNotesValidation,
  noteIdValidation,
  createNoteValidation,
  updateNoteValidation,
};
