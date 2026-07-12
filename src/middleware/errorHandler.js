const { fail } = require('../utils/response');

const notFound = (req, res) => {
  return fail(res, { statusCode: 404, message: 'Route not found' });
};

const errorHandler = (err, req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err);
  }

  if (err.code === 'P2002') {
    return fail(res, {
      statusCode: 409,
      message: 'A record with this unique identifier already exists.',
    });
  }

  if (err.code === 'P2003') {
    return fail(res, {
      statusCode: 400,
      message: 'Related record not found or cannot be modified.',
    });
  }

  if (err.code === 'P2025') {
    return fail(res, {
      statusCode: 404,
      message: 'Record not found.',
    });
  }

  if (err.name === 'JsonWebTokenError') {
    return fail(res, { statusCode: 401, message: 'Invalid token.' });
  }

  if (err.name === 'TokenExpiredError') {
    return fail(res, { statusCode: 401, message: 'Token expired.' });
  }

  const statusCode = err.statusCode || err.status || 500;
  const message =
    err.isOperational || statusCode < 500
      ? err.message
      : 'Something went wrong!';

  return fail(res, {
    statusCode,
    message,
    ...(process.env.NODE_ENV === 'development' && !err.isOperational
      ? { errors: [{ message: err.message }] }
      : {}),
  });
};

module.exports = { notFound, errorHandler };
