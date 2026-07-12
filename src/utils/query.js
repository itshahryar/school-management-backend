const AppError = require('./AppError');

/**
 * Parse and clamp pagination query params.
 */
const parsePagination = ({ page = 1, limit = 10 } = {}) => {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10));
  const skip = (safePage - 1) * safeLimit;

  return { page: safePage, limit: safeLimit, skip };
};

const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * Parse optional boolean query strings ("true" | "false").
 */
const parseOptionalBoolean = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new AppError('Invalid boolean value. Use true or false.', 400);
};

module.exports = {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
};
