const prisma = require('../../../lib/prisma');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { generateTokens, verifyRefreshToken } = require('../../../utils/jwt');
const crypto = require('crypto');

/**
 * Register a new user (public registration - defaults to STUDENT)
 * @param {Object} userData - User registration data
 * @returns {Object} Created user without password
 */
const registerUser = async (userData) => {
  const { email, password, firstName, lastName } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with default STUDENT role for public registration
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: 'STUDENT' // Default role for public registration
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    }
  });

  return user;
};

/**
 * Create a new user with specific role (admin only)
 * @param {Object} userData - User data with role
 * @returns {Object} Created user without password
 */
const createUserWithRole = async (userData) => {
  const { email, password, firstName, lastName, role } = userData;

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email }
  });

  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with specified role
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true
    }
  });

  return user;
};

/**
 * Login user
 * @param {String} email - User email
 * @param {String} password - User password
 * @returns {Object} User data and tokens
 */
const loginUser = async (email, password) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if user is active
  if (!user.isActive) {
    throw new Error('Account is deactivated');
  }

  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);

  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() }
  });

  // Generate tokens
  const tokens = generateTokens({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  // Return user data without password
  const { password: _, ...userWithoutPassword } = user;

  return {
    user: userWithoutPassword,
    ...tokens
  };
};

/**
 * Refresh access token
 * @param {String} refreshToken - JWT refresh token
 * @returns {Object} New access token
 */
const refreshToken = async (refreshToken) => {
  try {
    // Verify refresh token
    const decoded = verifyRefreshToken(refreshToken);

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId }
    });

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    // Generate new access token
    const accessToken = generateTokens({
      userId: user.id,
      email: user.email,
      role: user.role
    }).accessToken;

    return { accessToken };
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Get current user by ID
 * @param {String} userId - User ID
 * @returns {Object} User data without password
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
      lastLoginAt: true
    }
  });

  if (!user) {
    throw new Error('User not found');
  }

  return user;
};

/**
 * Request password reset
 * @param {String} email - User email
 * @returns {String} Reset token
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    // Don't reveal if user exists or not
    return { message: 'If the email exists, a reset link will be sent' };
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

  // Save reset token to database
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: resetToken,
      passwordResetExpiresAt: resetTokenExpiry
    }
  });

  return {
    message: 'If the email exists, a reset link will be sent',
    resetToken // In production, send this via email
  };
};

/**
 * Reset password with token
 * @param {String} token - Reset token
 * @param {String} newPassword - New password
 * @returns {Object} Success message
 */
const resetPassword = async (token, newPassword) => {
  // Find user with valid reset token
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetExpiresAt: {
        gt: new Date()
      }
    }
  });

  if (!user) {
    throw new Error('Invalid or expired reset token');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update user password and clear reset token
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordResetToken: null,
      passwordResetExpiresAt: null
    }
  });

  return { message: 'Password reset successfully' };
};

/**
 * Change password (authenticated user)
 * @param {String} userId - User ID
 * @param {String} currentPassword - Current password
 * @param {String} newPassword - New password
 * @returns {Object} Success message
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Find user
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);

  if (!isPasswordValid) {
    throw new Error('Current password is incorrect');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword }
  });

  return { message: 'Password changed successfully' };
};

/**
 * Logout user (client-side mainly, but can be used for server-side cleanup)
 * @returns {Object} Success message
 */
const logoutUser = async () => {
  // In a stateless JWT system, logout is mainly handled on the client side
  // by removing tokens. This can be extended with token blacklisting if needed.
  return { message: 'Logged out successfully' };
};

module.exports = {
  registerUser,
  createUserWithRole,
  loginUser,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  logoutUser
};
