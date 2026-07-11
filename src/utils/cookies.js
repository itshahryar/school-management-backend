/**
 * Cookie configuration for authentication token
 */
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000, // 1 day
  path: '/'
};

/**
 * Set authentication token cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT token
 */
const setAuthCookie = (res, token) => {
  res.cookie('token', token, cookieOptions);
};

/**
 * Clear authentication token cookie
 * @param {Object} res - Express response object
 */
const clearAuthCookie = (res) => {
  res.clearCookie('token', { path: '/' });
};

module.exports = {
  cookieOptions,
  setAuthCookie,
  clearAuthCookie
};
