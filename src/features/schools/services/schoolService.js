const prisma = require('../../../lib/prisma');
const AppError = require('../../../utils/AppError');
const {
  parsePagination,
  buildPaginationMeta,
  parseOptionalBoolean,
} = require('../../../utils/query');

const schoolSelect = {
  id: true,
  name: true,
  code: true,
  address: true,
  postalCode: true,
  primaryPhone: true,
  secondaryPhone: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
  _count: {
    select: {
      members: true,
      subjects: true,
    },
  },
};

const memberSelect = {
  id: true,
  designation: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
    },
  },
};

const userSchoolSelect = {
  id: true,
  designation: true,
  school: {
    select: schoolSelect,
  },
};

const normalizeOptionalString = (value) => {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const ensureSchoolExists = async (id) => {
  const school = await prisma.school.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!school) throw new AppError('School not found', 404);
  return school;
};

const ensureUsersExist = async (userIds) => {
  if (!userIds.length) return;

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true },
  });

  if (users.length !== userIds.length) {
    throw new AppError('One or more users were not found', 404);
  }
};

const ensureSubjectsExist = async (subjectIds) => {
  if (!subjectIds.length) return;

  const subjects = await prisma.subject.findMany({
    where: { id: { in: subjectIds } },
    select: { id: true },
  });

  if (subjects.length !== subjectIds.length) {
    throw new AppError('One or more subjects were not found', 404);
  }
};

const syncMembers = async (schoolId, members = []) => {
  const normalized = members.map((member) => ({
    userId: member.userId,
    designation: normalizeOptionalString(member.designation) ?? null,
  }));

  const userIds = normalized.map((member) => member.userId);
  await ensureUsersExist(userIds);

  await prisma.$transaction([
    prisma.userSchool.deleteMany({ where: { schoolId } }),
    ...(normalized.length
      ? [
          prisma.userSchool.createMany({
            data: normalized.map((member) => ({
              schoolId,
              userId: member.userId,
              designation: member.designation,
            })),
          }),
        ]
      : []),
  ]);
};

const syncSubjects = async (schoolId, subjectIds = []) => {
  const uniqueSubjectIds = [...new Set(subjectIds)];
  await ensureSubjectsExist(uniqueSubjectIds);

  await prisma.$transaction([
    prisma.schoolSubject.deleteMany({ where: { schoolId } }),
    ...(uniqueSubjectIds.length
      ? [
          prisma.schoolSubject.createMany({
            data: uniqueSubjectIds.map((subjectId) => ({
              schoolId,
              subjectId,
            })),
          }),
        ]
      : []),
  ]);
};

const listSchools = async (query = {}) => {
  const { page, limit, skip } = parsePagination(query);
  const where = {};

  if (query.search?.trim()) {
    const term = query.search.trim();
    where.OR = [
      { name: { contains: term, mode: 'insensitive' } },
      { code: { contains: term, mode: 'insensitive' } },
      { address: { contains: term, mode: 'insensitive' } },
    ];
  }

  const isActive = parseOptionalBoolean(query.isActive);
  if (typeof isActive === 'boolean') where.isActive = isActive;

  const [schools, total] = await Promise.all([
    prisma.school.findMany({
      where,
      select: schoolSelect,
      orderBy: [{ name: 'asc' }],
      skip,
      take: limit,
    }),
    prisma.school.count({ where }),
  ]);

  return {
    schools,
    pagination: buildPaginationMeta(total, page, limit),
  };
};

const getSchoolById = async (id) => {
  const school = await prisma.school.findUnique({
    where: { id },
    select: {
      ...schoolSelect,
      members: {
        select: memberSelect,
        orderBy: [{ user: { firstName: 'asc' } }, { user: { lastName: 'asc' } }],
      },
      subjects: {
        select: {
          id: true,
          subject: {
            select: {
              id: true,
              name: true,
              code: true,
              isActive: true,
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: [
          { subject: { class: { sortOrder: 'asc' } } },
          { subject: { class: { name: 'asc' } } },
          { subject: { sortOrder: 'asc' } },
          { subject: { name: 'asc' } },
        ],
      },
    },
  });

  if (!school) throw new AppError('School not found', 404);
  return school;
};

const createSchool = async (
  {
    name,
    code,
    address,
    postalCode,
    primaryPhone,
    secondaryPhone,
    isActive,
    members,
    subjectIds,
  },
  createdById
) => {
  const school = await prisma.school.create({
    data: {
      name: name.trim(),
      code: normalizeOptionalString(code),
      address: normalizeOptionalString(address),
      postalCode: normalizeOptionalString(postalCode),
      primaryPhone: normalizeOptionalString(primaryPhone),
      secondaryPhone: normalizeOptionalString(secondaryPhone),
      isActive: isActive ?? true,
      createdById,
    },
    select: schoolSelect,
  });

  if (members?.length) {
    await syncMembers(school.id, members);
  }

  if (subjectIds?.length) {
    await syncSubjects(school.id, subjectIds);
  }

  return getSchoolById(school.id);
};

const updateSchool = async (id, payload) => {
  await ensureSchoolExists(id);

  const data = {};
  if (payload.name !== undefined) data.name = payload.name.trim();
  if (payload.code !== undefined) data.code = normalizeOptionalString(payload.code);
  if (payload.address !== undefined) {
    data.address = normalizeOptionalString(payload.address);
  }
  if (payload.postalCode !== undefined) {
    data.postalCode = normalizeOptionalString(payload.postalCode);
  }
  if (payload.primaryPhone !== undefined) {
    data.primaryPhone = normalizeOptionalString(payload.primaryPhone);
  }
  if (payload.secondaryPhone !== undefined) {
    data.secondaryPhone = normalizeOptionalString(payload.secondaryPhone);
  }
  if (payload.isActive !== undefined) data.isActive = Boolean(payload.isActive);

  if (Object.keys(data).length) {
    await prisma.school.update({ where: { id }, data });
  }

  if (payload.members !== undefined) {
    await syncMembers(id, payload.members);
  }

  if (payload.subjectIds !== undefined) {
    await syncSubjects(id, payload.subjectIds);
  }

  if (
    !Object.keys(data).length &&
    payload.members === undefined &&
    payload.subjectIds === undefined
  ) {
    throw new AppError('No changes provided', 400);
  }

  return getSchoolById(id);
};

const deleteSchool = async (id) => {
  await ensureSchoolExists(id);
  await prisma.school.delete({ where: { id } });
  return { id };
};

const getMySchools = async (userId) => {
  const memberships = await prisma.userSchool.findMany({
    where: { userId },
    select: userSchoolSelect,
    orderBy: [{ school: { name: 'asc' } }],
  });

  return {
    schools: memberships.map((membership) => ({
      ...membership.school,
      designation: membership.designation,
      membershipId: membership.id,
    })),
  };
};

const getSchoolCurriculum = async (schoolId, userId, userRole) => {
  await ensureSchoolExists(schoolId);

  if (userRole !== 'OWNER') {
    const membership = await prisma.userSchool.findUnique({
      where: {
        userId_schoolId: { userId, schoolId },
      },
    });
    if (!membership) {
      throw new AppError('You do not have access to this school', 403);
    }
  }

  const assignments = await prisma.schoolSubject.findMany({
    where: { schoolId },
    select: {
      subject: {
        select: {
          id: true,
          name: true,
          code: true,
          description: true,
          sortOrder: true,
          isActive: true,
          class: {
            select: {
              id: true,
              name: true,
              description: true,
              sortOrder: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: [
      { subject: { class: { sortOrder: 'asc' } } },
      { subject: { class: { name: 'asc' } } },
      { subject: { sortOrder: 'asc' } },
      { subject: { name: 'asc' } },
    ],
  });

  const classMap = new Map();

  for (const { subject } of assignments) {
    const classId = subject.class.id;
    if (!classMap.has(classId)) {
      classMap.set(classId, {
        ...subject.class,
        subjects: [],
      });
    }
    classMap.get(classId).subjects.push({
      id: subject.id,
      name: subject.name,
      code: subject.code,
      description: subject.description,
      sortOrder: subject.sortOrder,
      isActive: subject.isActive,
    });
  }

  return {
    schoolId,
    classes: [...classMap.values()],
  };
};

const syncUserSchools = async (userId, schoolAssignments = []) => {
  const normalized = schoolAssignments.map((assignment) => ({
    schoolId: assignment.schoolId,
    designation: normalizeOptionalString(assignment.designation) ?? null,
  }));

  const schoolIds = normalized.map((assignment) => assignment.schoolId);
  if (schoolIds.length) {
    const schools = await prisma.school.findMany({
      where: { id: { in: schoolIds } },
      select: { id: true },
    });
    if (schools.length !== schoolIds.length) {
      throw new AppError('One or more schools were not found', 404);
    }
  }

  await prisma.$transaction([
    prisma.userSchool.deleteMany({ where: { userId } }),
    ...(normalized.length
      ? [
          prisma.userSchool.createMany({
            data: normalized.map((assignment) => ({
              userId,
              schoolId: assignment.schoolId,
              designation: assignment.designation,
            })),
          }),
        ]
      : []),
  ]);
};

module.exports = {
  listSchools,
  getSchoolById,
  createSchool,
  updateSchool,
  deleteSchool,
  getMySchools,
  getSchoolCurriculum,
  syncUserSchools,
};
