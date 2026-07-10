const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const {
  createUserValidation,
  loginValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  changePasswordValidation
} = require('../validations/authValidation');
const { authenticate } = require('../../../middleware/auth');
const { ownerOnly } = require('../../../middleware/authorization');

// Public routes
router.post('/login', loginValidation, authController.login);
router.post('/forgot-password', forgotPasswordValidation, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidation, authController.resetPassword);
router.post('/setup-owner', createUserValidation, authController.createOwner); // Public endpoint for initial setup

// Protected routes
router.post('/refresh', authController.refresh);
router.get('/me', authenticate, authController.getCurrentUser);
router.post('/change-password', authenticate, changePasswordValidation, authController.changePassword);
router.post('/logout', authenticate, authController.logout);

// Owner routes - create users with specific roles
router.post('/users', authenticate, ownerOnly, createUserValidation, authController.createUser);

module.exports = router;
