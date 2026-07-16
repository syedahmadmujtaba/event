// Fixed permission vocabulary. Roles grant a subset of these (see schema).
// Extend this map as new admin capabilities land — it's the single source of truth.
export const PERMISSIONS = {
  "event.manage": "Create & edit events, activities, and fee rules",
  "delegation.approve": "Approve or reject delegations",
  "payment.verify": "Review and verify payment slips",
  "match.manage": "Create fixtures and enter results",
  "credential.issue": "Issue and export credentials",
  "user.manage": "Manage users, host-student imports, and role assignments",
  "role.manage": "Create roles and configure their permissions",
  "delegation.self": "Coordinator: manage own delegation for its event",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ALL_PERMISSIONS = Object.keys(PERMISSIONS) as Permission[];
