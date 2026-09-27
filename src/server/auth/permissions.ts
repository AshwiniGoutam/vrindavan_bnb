export type Role = "owner" | "manager" | "staff" | "editor";

/** Single source of truth for RBAC. Enforced server-side; the UI only hides what a role can't use. */
export const PERMISSIONS = {
  "dashboard.view": ["owner", "manager", "staff", "editor"],
  "analytics.view": ["owner", "manager"],
  "bookings.view": ["owner", "manager", "staff"],
  "bookings.manage": ["owner", "manager", "staff"],
  "bookings.refund": ["owner", "manager"],
  "catalog.edit": ["owner", "manager", "editor"],
  "pricing.edit": ["owner", "manager"],
  "offers.edit": ["owner", "manager"],
  "content.edit": ["owner", "manager", "editor"],
  "media.manage": ["owner", "manager", "editor"],
  "enquiries.manage": ["owner", "manager", "staff"],
  "customers.view": ["owner", "manager", "staff"],
  "notifications.view": ["owner", "manager"],
  "policies.edit": ["owner", "manager"],
  "users.manage": ["owner"],
  "settings.manage": ["owner"],
  "audit.view": ["owner"],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export const can = (role: Role, permission: Permission) => (PERMISSIONS[permission] as readonly Role[]).includes(role);
