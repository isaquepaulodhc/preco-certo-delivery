const adminRoles = new Set(["admin", "owner", "support"]);

export function isAdminRole(role: string | null | undefined) {
  return role != null && adminRoles.has(role);
}

export function isUserAdmin(adminRecord: { role?: string | null } | null | undefined) {
  return Boolean(adminRecord && isAdminRole(adminRecord.role));
}
