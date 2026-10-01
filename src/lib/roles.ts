/**
 * The staff roles, and what each one can actually reach.
 *
 * The descriptions below are not aspirational — they were read off the guards
 * in src/app/api/admin/**, which is the only thing that really decides access.
 * If a guard changes, this file has to change with it, or the staff screen will
 * be telling an owner something untrue about who can see their costs.
 *
 * Note that ADMIN and MANAGER currently reach the same API routes. The one
 * thing only an ADMIN may do is manage staff itself (see api/admin/staff) —
 * deciding who else gets access is the highest privilege in the panel, so it is
 * deliberately not delegable to a manager.
 */

export const STAFF_ROLE_VALUES = ["ADMIN", "MANAGER", "STAFF"] as const;
export type StaffRole = (typeof STAFF_ROLE_VALUES)[number];

export interface RoleDefinition {
  value: StaffRole;
  label: string;
  /** One line for the role chip's tooltip and the picker. */
  summary: string;
  /** What this role can do, in the owner's terms. */
  can: string[];
  /** What it deliberately cannot, so the choice is informed. */
  cannot: string[];
}

export const STAFF_ROLES: RoleDefinition[] = [
  {
    value: "ADMIN",
    label: "Admin",
    summary: "Full access, including adding and removing staff",
    can: [
      "Everything a manager can do",
      "Add staff, change their role, and revoke access",
    ],
    cannot: [],
  },
  {
    value: "MANAGER",
    label: "Manager",
    summary: "Runs the shop day to day, including money and content",
    can: [
      "Orders, products, inventory and customers",
      "Expenses, profit figures and reports",
      "Brands, categories, coupons and site content",
    ],
    cannot: ["Add staff or change anyone's role"],
  },
  {
    value: "STAFF",
    label: "Staff",
    summary: "Handles orders and stock, sees no money figures",
    can: [
      "Orders: confirm, pack, ship, record payments",
      "Products and stock adjustments",
      "Look up a customer when taking a manual order",
    ],
    cannot: [
      "See expenses, costs or profit",
      "Change brands, categories, coupons or site content",
      "Add staff or change anyone's role",
    ],
  },
];

const BY_VALUE = new Map(STAFF_ROLES.map((r) => [r.value, r]));

export function roleDefinition(value: string): RoleDefinition | undefined {
  return BY_VALUE.get(value as StaffRole);
}

/** Display label for a stored role, falling back to the raw value so an
 *  unexpected one is still legible rather than rendering blank. */
export function roleLabel(value: string): string {
  return BY_VALUE.get(value as StaffRole)?.label ?? value;
}

export function isStaffRole(value: string): value is StaffRole {
  return BY_VALUE.has(value as StaffRole);
}
