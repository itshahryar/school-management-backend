const { body, param, query } = require('express-validator');
const validate = require('../../../middleware/validate');
const { ASSIGNABLE_ROLES, ROLE_VALUES } = require('../../../constants/roles');

const passwordRules = (field = 'password') =>
  body(field)
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );

const optionalPasswordRules = (field = 'password') =>
  body(field)
    .optional({ values: 'falsy' })
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    );

const nameRules = (field, label) =>
  body(field)
    .trim()
    .notEmpty()
    .withMessage(`${label} is required`)
    .isLength({ min: 2, max: 50 })
    .withMessage(`${label} must be between 2 and 50 characters`);

const emailRules = () =>
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .trim();

const confirmPasswordRules = (compareField) =>
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body[compareField]) {
      throw new Error('Password confirmation does not match');
    }
    return true;
  });

const setupOwnerValidation = [
  emailRules(),
  passwordRules('password'),
  nameRules('firstName', 'First name'),
  nameRules('lastName', 'Last name'),
  validate,
];

const createUserValidation = [
  emailRules(),
  passwordRules('password'),
  nameRules('firstName', 'First name'),
  nameRules('lastName', 'Last name'),
  body('role')
    .trim()
    .notEmpty()
    .withMessage('Role is required')
    .isIn(ASSIGNABLE_ROLES)
    .withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),
  body('primaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('secondaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('primaryPhoneVerified').optional().isBoolean().toBoolean(),
  body('nationalId').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('schoolAssignments')
    .optional()
    .isArray()
    .withMessage('schoolAssignments must be an array'),
  body('schoolAssignments.*.schoolId')
    .isUUID()
    .withMessage('Each school assignment must have a valid schoolId'),
  body('schoolAssignments.*.designation')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 }),
  validate,
];

const updateUserValidation = [
  param('id').isUUID().withMessage('Invalid user id'),
  nameRules('firstName', 'First name'),
  nameRules('lastName', 'Last name'),
  emailRules(),
  body('role')
    .optional()
    .trim()
    .isIn(ASSIGNABLE_ROLES)
    .withMessage(`Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`),
  body('isActive').optional().isBoolean().toBoolean(),
  optionalPasswordRules('password'),
  body('confirmPassword')
    .optional({ values: 'falsy' })
    .custom((value, { req }) => {
      if (req.body.password && value !== req.body.password) {
        throw new Error('Password confirmation does not match');
      }
      return true;
    }),
  body('primaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('secondaryPhone').optional({ nullable: true }).trim().isLength({ max: 30 }),
  body('primaryPhoneVerified').optional().isBoolean().toBoolean(),
  body('nationalId').optional({ nullable: true }).trim().isLength({ max: 50 }),
  body('schoolAssignments')
    .optional()
    .isArray()
    .withMessage('schoolAssignments must be an array'),
  body('schoolAssignments.*.schoolId')
    .isUUID()
    .withMessage('Each school assignment must have a valid schoolId'),
  body('schoolAssignments.*.designation')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 }),
  validate,
];

const loginValidation = [
  emailRules(),
  body('password').notEmpty().withMessage('Password is required'),
  validate,
];

const forgotPasswordValidation = [emailRules(), validate];

const resetPasswordValidation = [
  body('token').notEmpty().withMessage('Reset token is required'),
  passwordRules('password'),
  confirmPasswordRules('password'),
  validate,
];

const changePasswordValidation = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  passwordRules('newPassword'),
  confirmPasswordRules('newPassword'),
  validate,
];

const listUsersValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
    .toInt(),
  query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('search must be at most 100 characters'),
  query('role')
    .optional()
    .trim()
    .isIn(ROLE_VALUES)
    .withMessage(`role must be one of: ${ROLE_VALUES.join(', ')}`),
  query('isActive')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('isActive must be true or false'),
  validate,
];

module.exports = {
  setupOwnerValidation,
  createUserValidation,
  updateUserValidation,
  listUsersValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  ROLE_VALUES,
};
