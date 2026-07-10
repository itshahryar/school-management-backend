const authService = require('../services/authService');
const { setAuthCookies, clearAuthCookies } = require('../../../utils/cookies');

/**
 * Register new user (public - defaults to STUDENT)
 */
const register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    const user = await authService.registerUser({
      email,
      password,
      firstName,
      lastName
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully as STUDENT',
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create user with specific role (owner only)
 */
const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    // Only OWNER can create users with specific roles
    if (req.user.role !== 'OWNER') {
      return res.status(403).json({
        success: false,
        message: 'Only Owner can create users with specific roles'
      });
    }

    const user = await authService.createUserWithRole({
      email,
      password,
      firstName,
      lastName,
      role
    });

    res.status(201).json({
      success: true,
      message: `User created successfully as ${role}`,
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Create initial owner (public endpoint for setup)
 */
const createOwner = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Check if any users already exist to prevent multiple owner creation
    const prisma = require('../../../lib/prisma');

    const existingUsers = await prisma.user.count();
    if (existingUsers > 0) {
      return res.status(403).json({
        success: false,
        message: 'System already initialized. Use login instead.'
      });
    }

    const user = await authService.createUserWithRole({
      email,
      password,
      firstName,
      lastName,
      role: 'OWNER'
    });

    res.status(201).json({
      success: true,
      message: 'Owner account created successfully',
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const { user, accessToken, refreshToken } = await authService.loginUser(email, password);

    // Set cookies
    setAuthCookies(res, accessToken, refreshToken);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        accessToken
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Refresh access token
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    const { accessToken } = await authService.refreshToken(refreshToken);

    // Set new access token cookie
    res.cookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60 * 1000,
      path: '/'
    });

    res.status(200).json({
      success: true,
      data: { accessToken }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Get current user
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getCurrentUser(req.user.id);

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(404).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Forgot password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.forgotPassword(email);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Reset password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    const result = await authService.resetPassword(token, password);

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Change password (authenticated)
 */
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const result = await authService.changePassword(
      req.user.id,
      currentPassword,
      newPassword
    );

    res.status(200).json({
      success: true,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    await authService.logoutUser();

    // Clear cookies
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

module.exports = {
  register,
  createUser,
  createOwner,
  login,
  refresh,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  logout
};
