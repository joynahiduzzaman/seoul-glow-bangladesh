import type { FullReport } from "@/server/reports";
import type { Sheet } from "./xlsx";

/**
 * The report as tabular data, once.
 *
 * CSV and Excel both render from this, so the two exports can't contain
 * different numbers, and adding a column means editing one place.
 */
/** Margin as a plain number for the spreadsheet; 0 when a row has no revenue,
 *  so the cell never reads NaN. */
function marginPct(profit: number, revenue: number): number {
  return revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : 0;
}

export function reportSheets(report: FullReport, meta: { filters: string; generated: string }): Sheet[] {
  const s = report.summary;

  return [
    {
      name: "Summary",
      rows: [
        ["Metric", "Value"],
        ["Generated", meta.generated],
        ["Filters", meta.filters],
        [],
        ["Orders", s.orders],
        ["Units sold", s.units],
        ["Gross (items)", s.gross],
        ["Discounts", -s.discount],
        ["Courier charges", s.shipping],
        ["Net total", s.net],
        ["Average order", s.averageOrder],
        [],
        // Kept apart from the totals above: cash on delivery means only a
        // delivered order is money actually collected.
        ["Delivered orders", s.deliveredOrders],
        ["Collected (delivered only)", s.deliveredNet],
        [],
        // Line-level, so these reconcile against the Products sheet rather
        // than against "Net total", which carries delivery and order-wide
        // discounts that belong to no single product.
        ["Item revenue", s.itemRevenue],
        ["Product cost", -s.cogs],
        ["Gross profit", s.grossProfit],
        ["Gross margin %", Number(s.grossMargin.toFixed(1))],
        ["Units with no cost recorded", s.unitsMissingCost],
        [],
        ["Note", "Gross profit excludes operating expenses (courier, ads, salary). See the dashboard for net profit."],
      ],
    },
    {
      name: "Sales by day",
      rows: [["Date", "Orders", "Total"], ...report.byDay.map((d) => [d.date, d.orders, d.total])],
    },
    {
      name: "Products",
      rows: [
        ["Product", "Brand", "Units", "Orders", "Revenue", "Cost", "Gross profit", "Margin %"],
        ...report.products.map((p) => [
          p.label, p.sublabel || "", p.units, p.orders, p.total, p.cost, p.profit, marginPct(p.profit, p.total),
        ]),
      ],
    },
    {
      name: "Categories",
      rows: [
        ["Category", "Units", "Orders", "Revenue", "Cost", "Gross profit", "Margin %"],
        ...report.categories.map((c) => [c.label, c.units, c.orders, c.total, c.cost, c.profit, marginPct(c.profit, c.total)]),
      ],
    },
    {
      name: "Brands",
      rows: [
        ["Brand", "Units", "Orders", "Revenue", "Cost", "Gross profit", "Margin %"],
        ...report.brands.map((b) => [b.label, b.units, b.orders, b.total, b.cost, b.profit, marginPct(b.profit, b.total)]),
      ],
    },
    {
      name: "Payment methods",
      rows: [["Method", "Orders", "Total"], ...report.payments.map((p) => [p.label, p.orders, p.total])],
    },
    {
      name: "Order sources",
      rows: [["Source", "Orders", "Total"], ...report.sources.map((r) => [r.label, r.orders, r.total])],
    },
  ];
}

/** RFC 4180. Quotes everything that could otherwise break a field, and guards
 *  the spreadsheet-formula injection case where a cell starting =, +, - or @
 *  is executed on open. */
export function toCsv(rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) => {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "'" + s;
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(cell).join(",")).join("\r\n");
}

/** One CSV holding every section, separated by a blank line and a title — a
 *  single file is what someone asking for "the report as CSV" expects, and a
 *  zip of seven files is not. */
export function reportToCsv(sheets: Sheet[]): string {
  return sheets
    .map((sheet) => [`# ${sheet.name}`, toCsv(sheet.rows)].join("\r\n"))
    .join("\r\n\r\n");
}
