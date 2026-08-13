import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/server/auth";
import { parseReportFilters, getFullReport, getReportOrders } from "@/server/reports";
import { reportSheets, reportToCsv, toCsv } from "@/server/export/report-sheets";
import { buildXlsx, type Sheet } from "@/server/export/xlsx";
import { COURIER_LABELS, type CourierValue } from "@/lib/shipping";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || !["ADMIN", "MANAGER", "STAFF"].includes(user.role)) return null;
  return user;
}

/** A human sentence describing what the file covers, written into it — a
 *  spreadsheet with no record of its filters is impossible to trust later. */
function describeFilters(sp: URLSearchParams): string {
  const parts: string[] = [];
  const named: [string, string][] = [
    ["q", "search"], ["status", "status"], ["payment", "payment"], ["courier", "courier"],
    ["source", "source"], ["productId", "product"], ["categoryId", "category"], ["brandId", "brand"],
  ];
  for (const [key, label] of named) {
    const v = sp.get(key);
    if (v) parts.push(`${label}=${v}`);
  }
  const from = sp.get("from");
  const to = sp.get("to");
  if (from || to) parts.push(`dates=${from || "start"}..${to || "today"}`);
  return parts.length ? parts.join(", ") : "all orders, no filters";
}

/**
 * GET /api/admin/reports/export?format=csv|xlsx|orders-csv
 *
 * Everything is computed from the same filters the reports page uses and
 * covers the whole filtered set — there is no pagination in here at all. An
 * export that silently covered only the visible page is the failure this is
 * written to avoid.
 *
 * PDF is not a format here: it's produced by /admin/reports/print, which is a
 * print-styled view of the same numbers that the browser saves as PDF — the
 * same mechanism the invoices and packing slips already use.
 */
export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") || "csv";
  const filters = parseReportFilters(Object.fromEntries(sp.entries()));
  const stamp = new Date().toISOString().slice(0, 10);
  const meta = { filters: describeFilters(sp), generated: new Date().toISOString() };

  // Row-level: one line per order, for anyone who wants to pivot it themselves.
  if (format === "orders-csv") {
    const orders = await getReportOrders(filters);
    const rows: (string | number)[][] = [
      ["Order", "Date", "Customer", "Phone", "Email", "District", "Status", "Payment method", "Payment status", "Source", "Courier", "Tracking", "Items", "Units", "Subtotal", "Discount", "Courier charge", "Total"],
      ...orders.map((o) => [
        o.orderNumber,
        o.createdAt.toISOString().slice(0, 10),
        o.user?.name || o.shippingName,
        o.shippingPhone,
        o.user?.email || o.guestEmail || "",
        o.shippingDistrict,
        o.status,
        o.paymentMethod,
        o.paymentStatus,
        o.source,
        o.shipment
          ? o.shipment.courier === "CUSTOM"
            ? o.shipment.customCourierName || "Custom"
            : COURIER_LABELS[o.shipment.courier as CourierValue] || o.shipment.courier
          : "",
        o.shipment?.trackingNumber || "",
        o.items.map((i) => `${i.name} x${i.quantity}`).join("; "),
        o.items.reduce((s, i) => s + i.quantity, 0),
        o.subtotal,
        o.discount,
        o.shippingFee,
        o.total,
      ]),
    ];
    return new NextResponse(toCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="seoul-glow-orders-${stamp}.csv"`,
      },
    });
  }

  const report = await getFullReport(filters);
  const sheets: Sheet[] = reportSheets(report, meta);

  if (format === "xlsx") {
    const buf = buildXlsx(sheets);
    // new Uint8Array(...): a Node Buffer is a Uint8Array at runtime, but its
    // TypeScript type is not in BodyInit.
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="seoul-glow-report-${stamp}.xlsx"`,
        "Content-Length": String(buf.length),
      },
    });
  }

  // A BOM, so Excel opens a UTF-8 CSV without mangling Bangla text and the ৳
  // sign — without it the default is the system codepage.
  return new NextResponse("﻿" + reportToCsv(sheets), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="seoul-glow-report-${stamp}.csv"`,
    },
  });
}
