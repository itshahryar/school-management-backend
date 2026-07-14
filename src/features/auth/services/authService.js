const crypto = require('crypto');
const prisma = require('../../../lib/prisma');
const { hashPassword, comparePassword } = require('../../../utils/password');
const { generateToken } = require('../../../utils/jwt');
const AppError = require('../../../utils/AppError');
const { ROLES, ASSIGNABLE_ROLES } = require('../../../constants/roles');

const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  emailVerified: true,
  primaryPhone: true,
  secondaryPhone: true,
  primaryPhoneVerified: true,
  address: true,
  postalCode: true,
  schoolName: true,
  designation: true,
  nationalId: true,
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
const createUser = async ({
  email,
  password,
  firstName,
  lastName,
  role,
  primaryPhone,
  secondaryPhone,
  primaryPhoneVerified,
  address,
  postalCode,
  schoolName,
  designation,
  nationalId,
}) => {
  await ensureEmailAvailable(email);

  return prisma.user.create({
    data: {
      email,
      password: await hashPassword(password),
      firstName,
      lastName,
      role,
      primaryPhone: primaryPhone || null,
      secondaryPhone: secondaryPhone || null,
      primaryPhoneVerified: Boolean(primaryPhoneVerified),
      address: address || null,
      postalCode: postalCode || null,
      schoolName: schoolName || null,
      designation: designation || null,
      nationalId: nationalId || null,
    },
    select: USER_PUBLIC_SELECT,
  });
};

const loginUser = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !(await comparePassword(password, user.password))) {
    throw new AppError('Invalid credentials', 401);
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
      { schoolName: { contains: term, mode: 'insensitive' } },
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

/**
 * Owner updates another user's details. Owner accounts cannot be deactivated.
 */
const updateUser = async (id, payload) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    throw new AppError('User not found', 404);
  }

  if (
    existing.role === ROLES.OWNER &&
    payload.isActive !== undefined &&
    payload.isActive === false
  ) {
    throw new AppError('Owner account cannot be set to inactive', 400);
  }

  if (payload.role !== undefined) {
    if (existing.role === ROLES.OWNER && payload.role !== ROLES.OWNER) {
      throw new AppError('Owner role cannot be changed', 400);
    }
    if (existing.role !== ROLES.OWNER && !ASSIGNABLE_ROLES.includes(payload.role)) {
      throw new AppError(
        `Role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`,
        400
      );
    }
  }

  if (payload.email && payload.email !== existing.email) {
    await ensureEmailAvailable(payload.email);
  }

  const data = {};
  if (payload.firstName !== undefined) data.firstName = payload.firstName.trim();
  if (payload.lastName !== undefined) data.lastName = payload.lastName.trim();
  if (payload.email !== undefined) data.email = payload.email.trim().toLowerCase();
  if (payload.role !== undefined && existing.role !== ROLES.OWNER) {
    data.role = payload.role;
  }
  if (payload.isActive !== undefined && existing.role !== ROLES.OWNER) {
    data.isActive = Boolean(payload.isActive);
  }
  if (payload.password) {
    data.password = await hashPassword(payload.password);
  }
  if (payload.primaryPhone !== undefined) {
    data.primaryPhone =
      typeof payload.primaryPhone === 'string'
        ? payload.primaryPhone.trim() || null
        : null;
  }
  if (payload.secondaryPhone !== undefined) {
    data.secondaryPhone =
      typeof payload.secondaryPhone === 'string'
        ? payload.secondaryPhone.trim() || null
        : null;
  }
  if (payload.primaryPhoneVerified !== undefined) {
    data.primaryPhoneVerified = Boolean(payload.primaryPhoneVerified);
  }
  if (payload.address !== undefined) {
    data.address =
      typeof payload.address === 'string'
        ? payload.address.trim() || null
        : null;
  }
  if (payload.postalCode !== undefined) {
    data.postalCode =
      typeof payload.postalCode === 'string'
        ? payload.postalCode.trim() || null
        : null;
  }
  if (payload.schoolName !== undefined) {
    data.schoolName =
      typeof payload.schoolName === 'string'
        ? payload.schoolName.trim() || null
        : null;
  }
  if (payload.designation !== undefined) {
    data.designation =
      typeof payload.designation === 'string'
        ? payload.designation.trim() || null
        : null;
  }
  if (payload.nationalId !== undefined) {
    data.nationalId =
      typeof payload.nationalId === 'string'
        ? payload.nationalId.trim() || null
        : null;
  }

  if (!Object.keys(data).length) {
    throw new AppError('No changes provided', 400);
  }

  return prisma.user.update({
    where: { id },
    data,
    select: USER_PUBLIC_SELECT,
  });
};

module.exports = {
  setupOwner,
  createUser,
  listUsers,
  updateUser,
  loginUser,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword,
};
