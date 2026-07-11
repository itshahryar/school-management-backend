const { verifyToken } = require('../utils/jwt');
const prisma = require('../lib/prisma');
const { fail } = require('../utils/response');

/**
 * Verifies JWT from HttpOnly cookie (or Authorization Bearer) and attaches user.
 */
const authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return fail(res, {
        statusCode: 401,
        message: 'Access denied. No token provided.',
      });
    }

    const decoded = verifyToken(token);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return fail(res, { statusCode: 401, message: 'User not found.' });
    }

    if (!user.isActive) {
      return fail(res, {
        statusCode: 403,
        message: 'Account is deactivated.',
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return fail(res, { statusCode: 401, message: 'Invalid token.' });
    }

    if (error.name === 'TokenExpiredError') {
      return fail(res, { statusCode: 401, message: 'Token expired.' });
    }

    console.error('Authentication error:', error);
    return fail(res, { statusCode: 500, message: 'Authentication failed.' });
  }
};

module.exports = { authenticate };
