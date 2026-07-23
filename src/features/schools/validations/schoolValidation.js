const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');

const idParam = param('id').isUUID().withMessage('Invalid id');

const memberRules = body('members')
  .optional()
  .isArray()
  .withMessage('members must be an array');

const memberItemRules = [
  body('members.*.userId').isUUID().withMessage('Each member must have a valid userId'),
  body('members.*.designation')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 }),
];

const subjectIdsRules = [
  body('subjectIds')
    .optional()
    .isArray()
    .withMessage('subjectIds must be an array'),
  body('subjectIds.*').isUUID().withMessage('Each subjectId must be a valid UUID'),
];

const listSchoolsValidation = [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('search').optional().trim().isLength({ max: 100 }),
  query('isActive').optional().isIn(['true', 'false']),
  validate,
];

const schoolIdValidation = [idParam, validate];

const createSchoolValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 200 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('postalCode').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('primaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('secondaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('isActive').optional().isBoolean().toBoolean(),
  memberRules,
  ...memberItemRules,
  ...subjectIdsRules,
  validate,
];

const updateSchoolValidation = [
  idParam,
  body('name').optional().trim().notEmpty().isLength({ max: 200 }),
  body('code').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('address').optional({ nullable: true }).trim().isLength({ max: 500 }),
  body('postalCode').optional({ nullable: true }).trim().isLength({ max: 20 }),
  body('primaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('secondaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('isActive').optional().isBoolean().toBoolean(),
  memberRules,
  ...memberItemRules,
  ...subjectIdsRules,
  validate,
];

module.exports = {
  listSchoolsValidation,
  schoolIdValidation,
  createSchoolValidation,
  updateSchoolValidation,
};
