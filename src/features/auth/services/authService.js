const crypto = require('crypto');
const prisma = require('../../../lib/prisma');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { generateToken } = require('../../../utils/jwt');
const AppError = require('../../../utils/AppError');
const { ROLES } = require('../../../constants/roles');

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  emailVerified: true,
  createdAt: true,
  updatedAt: true,
  lastLoginAt: true,
};

const hashResetToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

const ensureEmailAvailable = async (email) => {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('User with this email already exists', 409);
  }
};

/**
 * Bootstrap the first OWNER account (allowed only when no users exist).
 */
const setupOwner = async ({ email, password, firstName, lastName }) => {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    throw new AppError('System already initialized. Use login instead.', 403);
  }

  await ensureEmailAvailable(email);

  return prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      firstName,
      lastName,
      role: ROLES.OWNER,
    },
    select: USER_PUBLIC_SELECT,
  });
};

/**
 * Create a user with an assignable role (OWNER only via middleware).
 */
const createUser = async ({ email, password, firstName, lastName, role }) => {
  await ensureEmailAvailable(email);

  return prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      firstName,
      lastName,
      role,
    },
    select: USER_PUBLIC_SELECT,
  });
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError('Invalid credentials', 401);
  }

  if (!user.isActive) {
    throw new AppError('Account is deactivated', 403);
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: USER_PUBLIC_SELECT,
  });

  const token = generateToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  return { user: updatedUser, token };
};

const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
};

/**
 * Always returns a generic message. Reset token is only included in development
 * until email delivery is wired up.
 */
const forgotPassword = async (email) => {
  const generic = {
    message: 'If the email exists, a reset link will be sent',
  };

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return generic;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: hashResetToken(resetToken),
      passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  if (process.env.NODE_ENV === 'development') {
    return { ...generic, resetToken };
  }

  // TODO: send resetToken via email in production
  return generic;
};

const resetPassword = async (token, newPassword) => {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: hashResetToken(token),
      passwordResetExpiresAt: { gt: new Date() },
    },
  });

  if (!user) {
    throw new AppError('Invalid or expired reset token', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      passwordResetToken: null,
      passwordResetExpiresAt: null,
    },
  });

  return { message: 'Password reset successfully' };
};

const changePassword = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  if (!(await comparePassword(currentPassword, user.password))) {
    throw new AppError('Current password is incorrect', 400);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { password: await hashPassword(newPassword) },
  });

  return { message: 'Password changed successfully' };
};

/**
 * List users with server-side pagination, search, and filters.
 * @param {{ page?: number, limit?: number, search?: string, role?: string, isActive?: boolean }} params
 */
const listUsers = async ({
  page = 1,
  limit = 10,
  search,
  role,
  isActive,
} = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 10));
  const skip = (safePage - 1) * safeLimit;

  const where = {};

  if (search?.trim()) {
    const term = search.trim();
    where.OR = [
      { email: { contains: term, mode: 'insensitive' } },
      { firstName: { contains: term, mode: 'insensitive' } },
      { lastName: { contains: term, mode: 'insensitive' } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (typeof isActive === 'boolean') {
    where.isActive = isActive;
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: USER_PUBLIC_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: safeLimit,
    }),
    prisma.user.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / safeLimit));

  return {
    users,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages,
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    },
  };
};

module.exports = {
  setupOwner,
  createUser,
  listUsers,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
};
