const ROLES = Object.freeze({
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
});

const ROLE_VALUES = Object.freeze(Object.values(ROLES));

/** Roles an owner may assign when creating users (cannot create another OWNER). */
const ASSIGNABLE_ROLES = Object.freeze([ROLES.ADMIN]);

module.exports = {
  ROLES,
  ROLE_VALUES,
  ASSIGNABLE_ROLES,
};
