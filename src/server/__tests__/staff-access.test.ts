import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { STAFF_ROLES, STAFF_ROLE_VALUES, roleLabel, isStaffRole } from "@/lib/roles";

const read = (p: string) => readFileSync(path.resolve(process.cwd(), p), "utf8");

/**
 * Staff administration decides who can read every customer's address and phone
 * number, change prices, and see what the shop earns. Its failure modes are
 * both one-way: granting access that cannot be taken back, or removing the last
 * admin and locking everyone out of the panel permanently — recoverable only by
 * a developer with database access.
 *
 * The guards live in route handlers that need a request and a session to run,
 * so they are pinned by reading the source, the same way the bulk-order and
 * middleware guards are tested in bulk-orders.test.ts.
 */
describe("who can administer staff", () => {
  const collection = read("src/app/api/admin/staff/route.ts");
  const item = read("src/app/api/admin/staff/[id]/route.ts");

  it("is ADMIN only — a manager must not be able to promote themselves", () => {
    // The rest of the admin API allows ADMIN and MANAGER equally. This is the
    // one place that distinction has to mean something, so it checks for the
    // exact role rather than membership of a list.
    expect(collection).toMatch(/user\.role !== "ADMIN"/);
    expect(item).toMatch(/user\.role !== "ADMIN"/);
    expect(collection).not.toMatch(/\["ADMIN", "MANAGER"\]/);
    expect(item).not.toMatch(/\["ADMIN", "MANAGER"\]/);
  });

  it("guards every mutating handler, not just the listing", () => {
    for (const handler of ["GET", "POST"]) {
      expect(collection).toMatch(new RegExp(`export async function ${handler}`));
    }
    for (const handler of ["PATCH", "DELETE"]) {
      expect(item).toMatch(new RegExp(`export async function ${handler}`));
    }
    // requireAdmin is called once per handler: 2 here, 2 in the item route.
    expect(collection.match(/await requireAdmin\(\)/g)).toHaveLength(2);
    expect(item.match(/await requireAdmin\(\)/g)).toHaveLength(2);
  });
});

describe("lockout protection", () => {
  const item = read("src/app/api/admin/staff/[id]/route.ts");

  it("refuses to demote or remove the last admin", () => {
    expect(item).toMatch(/wouldRemoveLastAdmin/);
    expect(item).toMatch(/adminCount <= 1/);
  });

  it("checks for the last admin on BOTH role change and access removal", () => {
    // Removing access is a role change to CUSTOMER by another name; guarding
    // only one of the two routes would leave the lockout reachable.
    expect(item.match(/wouldRemoveLastAdmin\(/g)?.length).toBeGreaterThanOrEqual(3); // 1 definition + 2 call sites
  });

  it("stops an admin changing their own role or revoking their own access", () => {
    expect(item).toMatch(/target\.id === admin\.id/);
  });

  it("demotes rather than deletes, so the audit trail survives", () => {
    // These accounts are named on orders they recorded and payments they
    // verified. Deleting the row would strip "who confirmed this cash payment"
    // off real money.
    expect(item).toMatch(/data: \{ role: "CUSTOMER" \}/);
    expect(item).not.toMatch(/user\.delete\(/);
  });
});

describe("staff account creation", () => {
  const collection = read("src/app/api/admin/staff/route.ts");

  it("hashes the password instead of storing it", () => {
    expect(collection).toMatch(/hashPassword\(password\)/);
    expect(collection).not.toMatch(/password: password[,\s]/);
  });

  it("requires a password long enough to be worth having", () => {
    expect(collection).toMatch(/z\.string\(\)\.min\(8/);
  });

  it("never selects the password hash back out", () => {
    // A hash that reaches the client is a hash that can be attacked offline.
    const selectBlocks = collection.match(/select: \{[^}]*\}/g) || [];
    for (const block of selectBlocks) expect(block).not.toMatch(/password:\s*true/);
  });

  it("refuses an email that already exists rather than silently promoting it", () => {
    expect(collection).toMatch(/status: 409/);
  });
});

describe("the role definitions shown to the owner", () => {
  it("covers every role the system actually assigns", () => {
    expect(STAFF_ROLES.map((r) => r.value).sort()).toEqual([...STAFF_ROLE_VALUES].sort());
  });

  it("tells staff they cannot see money, because the API enforces exactly that", () => {
    // api/admin/expenses is ADMIN/MANAGER only, so this claim has to hold.
    const expenses = read("src/app/api/admin/expenses/route.ts");
    expect(expenses).toMatch(/\["ADMIN", "MANAGER"\]/);
    const staffRole = STAFF_ROLES.find((r) => r.value === "STAFF")!;
    expect(staffRole.cannot.join(" ").toLowerCase()).toMatch(/cost|profit|expense/);
  });

  it("gives every role a label and a usable summary", () => {
    for (const r of STAFF_ROLES) {
      expect(r.label.length).toBeGreaterThan(0);
      expect(r.summary.length).toBeGreaterThan(0);
      expect(r.can.length).toBeGreaterThan(0);
    }
  });

  it("falls back to the raw value for an unknown role rather than rendering blank", () => {
    expect(roleLabel("SOMETHING_ELSE")).toBe("SOMETHING_ELSE");
    expect(isStaffRole("SOMETHING_ELSE")).toBe(false);
    expect(isStaffRole("ADMIN")).toBe(true);
  });
});

describe("recording what a restock cost", () => {
  const adjust = read("src/app/api/admin/inventory/adjust/route.ts");

  it("refuses a cost from STAFF, who may adjust stock but not write expenses", () => {
    // Without this the stock-adjust route would be a back door into the
    // expenses table, which is ADMIN/MANAGER only.
    expect(adjust).toMatch(/\["ADMIN", "MANAGER"\]\.includes\(user\.role\)/);
  });

  it("only accepts a cost when stock is going up", () => {
    expect(adjust).toMatch(/change < 0/);
  });

  it("files it as a stock purchase, which is excluded from profit", () => {
    expect(adjust).toMatch(/category: "INVENTORY"/);
  });

  it("does not roll back the stock movement if the bookkeeping fails", () => {
    // Stock is what the shop runs on; a failed expense write must not undo it.
    expect(adjust).toMatch(/warning:/);
    expect(adjust.indexOf("await adjustStock(")).toBeLessThan(adjust.indexOf("prisma.expense.create"));
  });
});
