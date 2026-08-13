// Bulk order actions and filters, against real seeded test orders.
// Every order created here is deleted and its stock restored at the end.
import fs from "fs";
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const { PrismaClient } = await import("@prisma/client");
const { SignJWT } = await import("jose");
const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
let failures = 0;
const ok = (l, p, e = "") => { if (!p) failures++; console.log(`  ${p ? "OK  " : "FAIL"} ${l}${e ? "  " + e : ""}`); };

const admin = await prisma.user.findFirst({ where: { role: "ADMIN" }, select: { id: true, role: true, email: true, name: true } });
const token = await new SignJWT({ userId: admin.id, role: admin.role, email: admin.email })
  .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m")
  .sign(new TextEncoder().encode(process.env.JWT_SECRET));
const headers = { "content-type": "application/json", cookie: `access_token=${token}` };

// A product of our own rather than one of the shop's: real stock is low and
// a test that moves it around risks leaving a live product miscounted.
const brand = await prisma.brand.findFirst();
const category = await prisma.category.findFirst();
const product = await prisma.product.create({
  data: {
    name: "ZZ Bulk Test Product", slug: "zz-bulk-test-product-" + Date.now(),
    description: "Temporary product for an automated bulk-action check.",
    price: 1000, stock: 200, status: "ACTIVE", images: "[]",
    brandId: brand.id, categoryId: category.id,
  },
});
const stockBefore = product.stock;
const realOrderIds = (await prisma.order.findMany({ select: { id: true } })).map((o) => o.id);
const created = [];

const makeOrder = async (qty = 1) => {
  const res = await fetch(`${BASE}/api/admin/orders`, {
    method: "POST", headers,
    body: JSON.stringify({
      items: [{ productId: product.id, quantity: qty }],
      shipping: { name: "ZZ Bulk Probe", phone: "01700000000", district: "Dhaka", area: "Mirpur", street: "Rd 1", insideDhaka: true },
      paymentMethod: "COD", source: "PHONE", saveAsDraft: false,
    }),
  });
  const b = await res.json();
  if (!b.order) { console.log("    order create failed:", res.status, JSON.stringify(b)); throw new Error("could not seed an order"); }
  created.push(b.order.id);
  return b.order;
};
const bulk = (payload) => fetch(`${BASE}/api/admin/orders/bulk`, { method: "POST", headers, body: JSON.stringify(payload) }).then(async (r) => ({ status: r.status, body: await r.json() }));
const statusOf = async (id) => (await prisma.order.findUnique({ where: { id }, select: { status: true } })).status;

try {
  console.log(`using "${product.name}", stock ${stockBefore}\n`);

  console.log("=== Bulk status change ===");
  const a = await makeOrder(), b = await makeOrder(), c = await makeOrder();
  let r = await bulk({ ids: [a.id, b.id, c.id], action: "changeStatus", status: "CONFIRMED" });
  ok("three pending orders confirmed", r.body.count === 3 && r.body.skipped === 0, JSON.stringify(r.body));
  ok("all three actually moved", (await Promise.all([a, b, c].map((o) => statusOf(o.id)))).every((s) => s === "CONFIRMED"));
  const stockAfterConfirm = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
  ok("confirming moves no stock", stockAfterConfirm === stockBefore - 3, `${stockAfterConfirm} vs ${stockBefore - 3}`);

  console.log("\n=== Illegal transitions are skipped, not fatal ===");
  r = await bulk({ ids: [a.id, b.id], action: "changeStatus", status: "DELIVERED" });
  ok("confirmed -> delivered refused for both", r.body.count === 0 && r.body.skipped === 2, JSON.stringify(r.body.details));
  ok("the reason names the valid next steps", /packed/i.test(r.body.details?.[0]?.reason || ""), r.body.details?.[0]?.reason);
  ok("neither order moved", (await statusOf(a.id)) === "CONFIRMED" && (await statusOf(b.id)) === "CONFIRMED");

  console.log("\n=== Mixed batch: some move, some can't ===");
  const d = await makeOrder();
  r = await bulk({ ids: [a.id, d.id], action: "changeStatus", status: "PACKED" });
  ok("the confirmed one advanced, the pending one was skipped", r.body.count === 1 && r.body.skipped === 1, JSON.stringify(r.body));
  ok("partial success is reported per order", Boolean(r.body.details?.[0]?.orderNumber));

  console.log("\n=== Move to next status ===");
  r = await bulk({ ids: [b.id, c.id, d.id], action: "nextStatus" });
  ok("each order took its own next step", r.body.count === 3, JSON.stringify(r.body));
  ok("confirmed became packed", (await statusOf(b.id)) === "PACKED");
  ok("pending became confirmed", (await statusOf(d.id)) === "CONFIRMED");
  const delivered = await makeOrder();
  for (const s of ["CONFIRMED", "PACKED", "SHIPPED", "DELIVERED"]) await bulk({ ids: [delivered.id], action: "changeStatus", status: s });
  r = await bulk({ ids: [delivered.id], action: "nextStatus" });
  ok("a delivered order has no next step", r.body.count === 0 && /no next step/i.test(r.body.details?.[0]?.reason || ""), r.body.details?.[0]?.reason);

  console.log("\n=== Stock is not double-counted ===");
  const cancelMe = await makeOrder(2);
  const beforeCancel = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
  r = await bulk({ ids: [cancelMe.id, cancelMe.id, cancelMe.id], action: "changeStatus", status: "CANCELLED" });
  const afterCancel = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
  ok("the same order three times in one request restocks once", afterCancel === beforeCancel + 2, `${beforeCancel} -> ${afterCancel}, expected +2`);
  ok("and reports one change, not three", r.body.count === 1, JSON.stringify(r.body));
  r = await bulk({ ids: [cancelMe.id], action: "changeStatus", status: "CANCELLED" });
  ok("cancelling an already-cancelled order does nothing", r.body.count === 0 && (await prisma.product.findUnique({ where: { id: product.id } })).stock === afterCancel);

  console.log("\n=== Drafts are protected ===");
  const draftRes = await fetch(`${BASE}/api/admin/orders`, {
    method: "POST", headers,
    body: JSON.stringify({ items: [{ productId: product.id, quantity: 1 }], shipping: { name: "ZZ Draft", phone: "01700000000", district: "Dhaka", area: "Mirpur", street: "Rd 1", insideDhaka: true }, paymentMethod: "COD", source: "PHONE", saveAsDraft: true }),
  });
  const draft = (await draftRes.json()).order;
  created.push(draft.id);
  const stockWithDraft = (await prisma.product.findUnique({ where: { id: product.id } })).stock;
  r = await bulk({ ids: [draft.id], action: "changeStatus", status: "PENDING" });
  ok("a draft can't be made live in bulk", r.body.count === 0 && /confirm/i.test(r.body.details?.[0]?.reason || ""), r.body.details?.[0]?.reason);
  ok("the draft is untouched", (await statusOf(draft.id)) === "DRAFT");
  ok("and no stock moved", (await prisma.product.findUnique({ where: { id: product.id } })).stock === stockWithDraft);
  r = await bulk({ ids: [draft.id], action: "nextStatus" });
  ok("next-status skips drafts too", r.body.count === 0, JSON.stringify(r.body.details));

  console.log("\n=== Courier assignment ===");
  const e1 = await makeOrder();
  r = await bulk({ ids: [e1.id, cancelMe.id], action: "assignCourier", courier: "PATHAO" });
  ok("live order got the courier, cancelled one skipped", r.body.count === 1 && r.body.skipped === 1, JSON.stringify(r.body));
  const ship = await prisma.shipment.findUnique({ where: { orderId: e1.id } });
  ok("a shipment row was created", ship?.courier === "PATHAO");
  r = await bulk({ ids: [e1.id], action: "assignCourier", courier: "REDX" });
  const ship2 = await prisma.shipment.findUnique({ where: { orderId: e1.id } });
  ok("reassigning updates rather than failing", r.body.count === 1 && ship2.courier === "REDX");
  const evs = await prisma.orderEvent.count({ where: { orderId: e1.id, type: "TRACKING" } });
  ok("each assignment is on the timeline", evs >= 2, `${evs} entries`);
  r = await bulk({ ids: [e1.id], action: "assignCourier", courier: "CUSTOM" });
  ok("a custom courier without a name is refused", r.status === 400, `${r.status}`);

  console.log("\n=== Guards ===");
  r = await bulk({ ids: [], action: "nextStatus" });
  ok("an empty selection is refused", r.status === 400);
  r = await bulk({ ids: Array.from({ length: 101 }, (_, i) => "x" + i), action: "nextStatus" });
  ok("more than 100 orders is refused", r.status === 400, r.body.error);
  const customer = await prisma.user.findFirst({ where: { role: "CUSTOMER" }, select: { id: true, role: true, email: true } });
  const custToken = await new SignJWT({ userId: customer.id, role: customer.role, email: customer.email })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("15m").sign(new TextEncoder().encode(process.env.JWT_SECRET));
  const asCust = await fetch(`${BASE}/api/admin/orders/bulk`, { method: "POST", headers: { "content-type": "application/json", cookie: `access_token=${custToken}` }, body: JSON.stringify({ ids: [e1.id], action: "nextStatus" }) });
  ok("a customer cannot run bulk actions", asCust.status === 403, `${asCust.status}`);

  console.log("\n=== Filters ===");
  const page = async (qs) => (await fetch(`${BASE}/admin/orders${qs}`, { headers: { cookie: `access_token=${token}` } })).status;
  for (const qs of ["", "?status=CONFIRMED", "?payment=PENDING", "?courier=REDX", "?courier=NONE", "?source=PHONE", "?from=2026-01-01&to=2026-12-31", "?q=ZZ+Bulk", "?status=PACKED&courier=NONE&source=PHONE&from=2026-01-01&to=2026-12-31&q=ZZ"]) {
    ok(`filter ${qs || "(none)"} loads`, (await page(qs)) === 200);
  }

  console.log("\n=== Batch print ===");
  for (const type of ["invoice", "packing-slip", "shipping-label"]) {
    const res = await fetch(`${BASE}/admin-print/orders/batch?type=${type}&ids=${[e1.id, d.id].join(",")}`, { headers: { cookie: `access_token=${token}` } });
    const html = await res.text();
    ok(`${type} batch renders both orders`, res.status === 200 && html.includes(e1.orderNumber) && html.includes(d.orderNumber), `${res.status}`);
  }
  const anon = await fetch(`${BASE}/admin-print/orders/batch?type=invoice&ids=${e1.id}`, { redirect: "manual" });
  ok("batch print is not public", anon.status >= 300 && anon.status < 400, `${anon.status}`);
} finally {
  for (const id of created) await prisma.order.delete({ where: { id } }).catch(() => {});
  await prisma.stockAdjustment.deleteMany({ where: { productId: product.id } });
  await prisma.product.delete({ where: { id: product.id } }).catch(() => {});
  const left = (await prisma.order.findMany({ select: { id: true } })).map((o) => o.id);
  console.log("\n--- cleanup ---");
  console.log("  test orders removed:", created.filter((id) => left.includes(id)).length === 0, `(${created.length} created)`);
  console.log("  real orders untouched:", realOrderIds.every((id) => left.includes(id)), `${left.length} left`);
  console.log("  test product removed:", (await prisma.product.findUnique({ where: { id: product.id } })) === null);
  console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
  await prisma.$disconnect();
  process.exit(failures === 0 ? 0 : 1);
}
