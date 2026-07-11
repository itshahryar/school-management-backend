const express = require('express');
// const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const {
  setupOwnerValidation,
  createUserValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require('../validations/authValidation');
const { authenticate } = require('../../../middleware/auth');
const { ownerOnly } = require('../../../middleware/authorization');

const router = express.Router();

// const authLimiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 20,
//   standardHeaders: true,
//   legacyHeaders: false,
//   message: {
//     success: false,
//     message: 'Too many attempts. Please try again later.',
//   },
// });

// Public
router.post('/login', loginValidation, authController.login);
router.post(
  '/forgot-password',
  forgotPasswordValidation,
  authController.forgotPassword
);
router.post(
  '/reset-password',
  resetPasswordValidation,
  authController.resetPassword
);
router.post(
  '/setup-owner',
  setupOwnerValidation,
  authController.setupOwner
);

// Authenticated
router.get('/me', authenticate, authController.getCurrentUser);
router.post(
  '/change-password',
  authenticate,
  changePasswordValidation,
  authController.changePassword
);
router.post('/logout', authenticate, authController.logout);

// Owner
router.post(
  '/users',
  authenticate,
  ownerOnly,
  createUserValidation,
  authController.createUser
);

module.exports = router;
