// Two fixed roles, not an open-ended permission picker:
// - guard: can view visitors and mark exit time only.
// - admin: everything a guard can do, plus editing/deleting visitors and
//   managing user accounts (creating guards/admins).
export const ROLES = {
  ADMIN: "admin",
  GUARD: "guard",
};

export const ROLE_VALUES = Object.values(ROLES);

export function isAdmin(auth) {
  return auth?.role === ROLES.ADMIN;
}
