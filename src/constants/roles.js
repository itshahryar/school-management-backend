const ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  TEACHER: 'TEACHER',
  STUDENT: 'STUDENT',
  PARENT: 'PARENT',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

/** Roles an owner may assign when creating users (cannot create another OWNER). */
const ASSIGNABLE_ROLES = Object.freeze([
  ROLES.ADMIN,
  ROLES.TEACHER,
  ROLES.STUDENT,
  ROLES.PARENT,
]);

module.exports = {
  ROLES,
  ROLE_VALUES,
  ASSIGNABLE_ROLES,
};
