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

/**
 * Blocks inactive accounts from business APIs. Allow /me and /logout without this.
 */
const requireActive = (req, res, next) => {
  if (!req.user) {
    return fail(res, {
      statusCode: 401,
      message: 'Authentication required.',
    });
  }

  if (!req.user.isActive) {
    return fail(res, {
      statusCode: 403,
      message: 'Account is deactivated.',
      code: 'ACCOUNT_INACTIVE',
    });
  }

  next();
};

const ownerOnly = authorize(ROLES.OWNER);
const adminOrHigher = authorize(ROLES.OWNER, ROLES.ADMIN);

module.exports = {
  authorize,
  requireActive,
  ownerOnly,
  adminOrHigher,
};
