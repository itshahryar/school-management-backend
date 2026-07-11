const authService = require('../services/authService');
const { setAuthCookie, clearAuthCookie } = require('../../../utils/cookies');
const { success } = require('../../../utils/response');
const asyncHandler = require('../../../utils/asyncHandler');

const setupOwner = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  const user = await authService.setupOwner({
    email,
    password,
    firstName,
    lastName,
  });

  return success(res, {
    statusCode: 201,
    message: 'Owner account created successfully',
    data: { user },
  });
});

const createUser = asyncHandler(async (req, res) => {
  const { email, password, firstName, lastName, role } = req.body;
  const user = await authService.createUser({
    email,
    password,
    firstName,
    lastName,
    role,
  });

  return success(res, {
    statusCode: 201,
    message: `User created successfully as ${role}`,
    data: { user },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const { page, limit, search, role, isActive } = req.query;

  let parsedIsActive;
  if (isActive === 'true') parsedIsActive = true;
  if (isActive === 'false') parsedIsActive = false;

  const result = await authService.listUsers({
    page,
    limit,
    search,
    role,
    isActive: parsedIsActive,
  });

  return success(res, { data: result });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { user, token } = await authService.loginUser(email, password);

  setAuthCookie(res, token);

  return success(res, {
    message: 'Login successful',
    data: { user },
  });
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  return success(res, { data: { user } });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const result = await authService.forgotPassword(req.body.email);
  return success(res, {
    message: result.message,
    ...(result.resetToken ? { data: { resetToken: result.resetToken } } : {}),
  });
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  const result = await authService.resetPassword(token, password);
  return success(res, { message: result.message });
});

const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const result = await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword
  );
  return success(res, { message: result.message });
});

const logout = asyncHandler(async (req, res) => {
  clearAuthCookie(res);
  return success(res, { message: 'Logged out successfully' });
});

module.exports = {
  setupOwner,
  createUser,
  listUsers,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
  logout,
};
