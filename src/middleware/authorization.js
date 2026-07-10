/**
 * Role-based authorization middleware
 * @param  {...String} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to access this resource.'
      });
    }

    next();
  };
};

/**
 * Owner-only authorization
 */
const ownerOnly = authorize('OWNER');

/**
 * Admin or higher authorization
 */
const adminOrHigher = authorize('OWNER', 'ADMIN');

/**
 * Teacher or higher authorization
 */
const teacherOrHigher = authorize('OWNER', 'ADMIN', 'TEACHER');

/**
 * Student or higher authorization
 */
const studentOrHigher = authorize('OWNER', 'ADMIN', 'TEACHER', 'STUDENT');

module.exports = {
  authorize,
  ownerOnly,
  adminOrHigher,
  teacherOrHigher,
  studentOrHigher
};
