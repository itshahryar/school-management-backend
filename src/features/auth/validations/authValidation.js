const { body } = require('express-validator');
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

module.exports = {
  setupOwnerValidation,
  createUserValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
  ROLE_VALUES,
};
