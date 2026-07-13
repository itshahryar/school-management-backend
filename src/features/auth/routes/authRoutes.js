const express = require('express');
// const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');
const {
  setupOwnerValidation,
  createUserValidation,
  updateUserValidation,
  listUsersValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation,
} = require('../validations/authValidation');
const { authenticate } = require('../../../middleware/auth');
const {
  ownerOnly,
  requireActive,
} = require('../../../middleware/authorization');

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

// Authenticated (inactive users may reach /me and /logout)
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/logout', authenticate, authController.logout);
router.post(
  '/change-password',
  authenticate,
  requireActive,
  changePasswordValidation,
  authController.changePassword
);

// Owner
router.get(
  '/users',
  authenticate,
  requireActive,
  ownerOnly,
  listUsersValidation,
  authController.listUsers
);
router.post(
  '/users',
  authenticate,
  requireActive,
  ownerOnly,
  createUserValidation,
  authController.createUser
);
router.patch(
  '/users/:id',
  authenticate,
  requireActive,
  ownerOnly,
  updateUserValidation,
  authController.updateUser
);

module.exports = router;
