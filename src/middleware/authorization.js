const { fail } = require('../utils/response');
const { ROLES } = require('../constants/roles');

/**
 * Restricts access to the given roles. Must run after authenticate.
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return fail(res, {
        statusCode: 401,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return fail(res, {
        statusCode: 403,
        message: 'You do not have permission to access this resource.',
      });
    }

    next();
  };
};

const ownerOnly = authorize(ROLES.OWNER);
const adminOrHigher = authorize(ROLES.OWNER, ROLES.ADMIN);

module.exports = {
  authorize,
  ownerOnly,
  adminOrHigher,
};
