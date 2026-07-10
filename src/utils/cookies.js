/**
 * Cookie configuration for authentication tokens
 */
const cookieOptions = {
  // Access token cookie options (shorter lifespan)
  accessToken: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/'
  },
  
  // Refresh token cookie options (longer lifespan)
  refreshToken: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/'
  }
};

/**
 * Set access token cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT access token
 */
const setAccessTokenCookie = (res, token) => {
  res.cookie('accessToken', token, cookieOptions.accessToken);
};

/**
 * Set refresh token cookie
 * @param {Object} res - Express response object
 * @param {String} token - JWT refresh token
 */
const setRefreshTokenCookie = (res, token) => {
  res.cookie('refreshToken', token, cookieOptions.refreshToken);
};

/**
 * Set both access and refresh token cookies
 * @param {Object} res - Express response object
 * @param {String} accessToken - JWT access token
 * @param {String} refreshToken - JWT refresh token
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  setAccessTokenCookie(res, accessToken);
  setRefreshTokenCookie(res, refreshToken);
};

/**
 * Clear access token cookie
 * @param {Object} res - Express response object
 */
const clearAccessTokenCookie = (res) => {
  res.clearCookie('accessToken', { path: '/' });
};

/**
 * Clear refresh token cookie
 * @param {Object} res - Express response object
 */
const clearRefreshTokenCookie = (res) => {
  res.clearCookie('refreshToken', { path: '/' });
};

/**
 * Clear all authentication cookies
 * @param {Object} res - Express response object
 */
const clearAuthCookies = (res) => {
  clearAccessTokenCookie(res);
  clearRefreshTokenCookie(res);
};

module.exports = {
  cookieOptions,
  setAccessTokenCookie,
  setRefreshTokenCookie,
  setAuthCookies,
  clearAccessTokenCookie,
  clearRefreshTokenCookie,
  clearAuthCookies
};
