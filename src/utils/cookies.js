/**
 * Cookie configuration for authentication token
 */
const isProduction = process.env.NODE_ENV === 'production';
const sameSiteSetting = process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax');

const cookieOptions = {
  httpOnly: true,
  secure: sameSiteSetting === 'none' ? true : isProduction,
  sameSite: sameSiteSetting,
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
