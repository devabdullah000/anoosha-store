/** Client-only jsPDF export from the already-generated report. No additional API calls. */
import type { SalesReport } from "./types";

const MONEY = (paisa: number) =>
  `Rs. ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const safe = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7E]/g, "?");

const pkt = (value: string): string => {
  const utc = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(utc.getTime())
    ? value
    : new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Karachi",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(utc);
};

const STATUS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export async function downloadSalesReportPdf(
  report: SalesReport,
): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
  });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 34;
  const ink: [number, number, number] = [25, 33, 51];
  const muted: [number, number, number] = [98, 109, 128];
  const indigo: [number, number, number] = [72, 60, 184];
  const green: [number, number, number] = [6, 127, 86];
  const border: [number, number, number] = [221, 226, 236];
  let y = M;
  let pageNo = 1;
  const font = (
    size: number,
    bold = false,
    color: [number, number, number] = ink,
  ) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const draw = (
    value: unknown,
    x: number,
    at: number,
    size = 9,
    bold = false,
    color: [number, number, number] = ink,
    align?: "right" | "center",
  ) => {
    font(size, bold, color);
    doc.text(safe(value), x, at, align ? { align } : undefined);
  };
  const fit = (value: unknown, maxWidth: number, size = 8): string => {
    const valueText = safe(value);
    font(size);
    if (doc.getTextWidth(valueText) <= maxWidth) return valueText;
    let text = valueText;
    while (text.length > 1 && doc.getTextWidth(`${text}...`) > maxWidth)
      text = text.slice(0, -1);
    return `${text}...`;
  };
  const line = (at: number) => {
    doc.setDrawColor(...border);
    doc.line(M, at, W - M, at);
  };
  const footer = () => {
    line(H - 32);
    draw(
      "Anoosha Store - sales reporting | Amounts PKR | Pakistan calendar days",
      M,
      H - 20,
      7,
      false,
      muted,
    );
    draw(`Page ${pageNo}`, W - M, H - 20, 7, false, muted, "right");
  };
  const nextPage = () => {
    footer();
    doc.addPage();
    pageNo++;
    y = M;
  };
  const ensure = (height: number) => {
    if (y + height > H - 45) nextPage();
  };
  const title = (text: string) => {
    ensure(32);
    draw(text, M, y + 13, 12, true, indigo);
    y += 27;
  };
  const tableHeader = (
    headers: Array<{ label: string; x: number; align?: "right" }>,
  ) => {
    ensure(24);
    doc.setFillColor(244, 246, 253);
    doc.rect(M, y - 3, W - 2 * M, 22, "F");
    for (const cell of headers)
      draw(cell.label, cell.x, y + 11, 8, true, muted, cell.align);
    y += 25;
  };
  const tableRow = (
    values: Array<{
      text: unknown;
      x: number;
      maxWidth?: number;
      align?: "right";
    }>,
    height = 21,
  ) => {
    ensure(height);
    values.forEach((cell) =>
      draw(
        cell.maxWidth ? fit(cell.text, cell.maxWidth, 8) : cell.text,
        cell.x,
        y + 11,
        8,
        false,
        ink,
        cell.align,
      ),
    );
    line(y + height - 2);
    y += height;
  };

  doc.setFillColor(248, 249, 255);
  doc.rect(0, 0, W, 105, "F");
  draw("ANOOSHA STORE", M, 51, 21, true, indigo);
  draw("SALES REPORT", W - M, 51, 18, true, ink, "right");
  draw(
    `${report.startDate} through ${report.endDate} (Asia/Karachi)`,
    M,
    77,
    10,
    true,
    muted,
  );
  draw(
    `Generated ${report.generatedAt.replace("T", " ").slice(0, 19)} UTC`,
    W - M,
    77,
    8,
    false,
    muted,
    "right",
  );
  y = 125;
  draw(
    `Scope: ${report.targets.scope === "store" ? "Entire store" : report.targets.scope === "categories" ? "Selected categories" : "Selected products / variants"}`,
    M,
    y,
    10,
    true,
    ink,
  );
  draw(
    `Matching orders: ${report.summary.orders}     Order lines: ${report.summary.lines}     Non-cancelled units: ${report.summary.activeUnits}`,
    W - M,
    y,
    9,
    false,
    muted,
    "right",
  );
  y += 24;
  line(y);
  y += 25;
  draw("AFTER-DISCOUNT SALES", M, y, 9, true, muted);
  draw("CANCELLED", M + 205, y, 9, true, muted);
  draw("NET SALES", M + 400, y, 9, true, muted);
  draw("DELIVERED", M + 592, y, 9, true, muted);
  y += 23;
  draw(MONEY(report.summary.totalAfterDiscountPaisa), M, y, 16, true, ink);
  draw(
    `-${MONEY(report.summary.cancelledPaisa)}`,
    M + 205,
    y,
    16,
    true,
    [174, 45, 68],
  );
  draw(MONEY(report.summary.netSalesPaisa), M + 400, y, 16, true, green);
  draw(MONEY(report.summary.deliveredPaisa), M + 592, y, 16, true, indigo);
  y += 24;
  draw(
    `Original merchandise: ${MONEY(report.summary.grossPaisa)}  |  Applied discounts: ${MONEY(report.summary.discountPaisa)}`,
    M,
    y,
    9,
    false,
    muted,
  );
  y += 22;
  draw(
    "Net sales includes pending and processing orders. It excludes cancelled orders; it is not a cash-received report. Shipping is excluded.",
    M,
    y,
    8,
    false,
    muted,
  );
  y += 16;

  title("ORDER STATUS BREAKDOWN");
  const stats = [
    { label: "Status", x: M + 2 },
    { label: "Orders", x: M + 200, align: "right" as const },
    { label: "Units", x: M + 295, align: "right" as const },
    { label: "Gross", x: M + 440, align: "right" as const },
    { label: "Discounts", x: M + 565, align: "right" as const },
    { label: "After discount", x: W - M - 3, align: "right" as const },
  ];
  tableHeader(stats);
  for (const s of report.byStatus) {
    tableRow([
      { text: STATUS[s.status], x: M + 2 },
      { text: s.orders, x: M + 200, align: "right" },
      { text: s.units, x: M + 295, align: "right" },
      { text: MONEY(s.grossPaisa), x: M + 440, align: "right" },
      { text: MONEY(s.discountPaisa), x: M + 565, align: "right" },
      { text: MONEY(s.netPaisa), x: W - M - 3, align: "right" },
    ]);
  }

  title("CATEGORY TOTALS (NON-CANCELLED)");
  const categoryHead = [
    { label: "Category", x: M + 2 },
    { label: "Orders", x: M + 330, align: "right" as const },
    { label: "Units", x: M + 420, align: "right" as const },
    { label: "Cancelled", x: M + 575, align: "right" as const },
    { label: "Net sales", x: W - M - 3, align: "right" as const },
  ];
  tableHeader(categoryHead);
  for (const row of report.byCategory) {
    if (y + 25 > H - 45) {
      nextPage();
      tableHeader(categoryHead);
    }
    tableRow([
      { text: row.categoryName, x: M + 2, maxWidth: 310 },
      { text: row.orders, x: M + 330, align: "right" },
      { text: row.units, x: M + 420, align: "right" },
      { text: MONEY(row.cancelledPaisa), x: M + 575, align: "right" },
      { text: MONEY(row.netSalesPaisa), x: W - M - 3, align: "right" },
    ]);
  }

  title("PRODUCT / VARIANT TOTALS (NON-CANCELLED)");
  const productHeader = [
    { label: "Product / variant", x: M + 2 },
    { label: "SKU", x: M + 300 },
    { label: "Orders", x: M + 473, align: "right" as const },
    { label: "Units", x: M + 538, align: "right" as const },
    { label: "Cancelled", x: M + 652, align: "right" as const },
    { label: "Net", x: W - M - 3, align: "right" as const },
  ];
  tableHeader(productHeader);
  for (const row of report.byVariant) {
    if (y + 25 > H - 45) {
      nextPage();
      tableHeader(productHeader);
    }
    tableRow(
      [
        {
          text: row.hasVariants
            ? `${row.productName} / ${row.variantName}`
            : row.productName,
          x: M + 2,
          maxWidth: 283,
        },
        { text: row.sku, x: M + 300, maxWidth: 150 },
        { text: row.orderCount, x: M + 473, align: "right" },
        { text: row.units, x: M + 538, align: "right" },
        { text: MONEY(row.cancelledPaisa), x: M + 652, align: "right" },
        { text: MONEY(row.netSalesPaisa), x: W - M - 3, align: "right" },
      ],
      23,
    );
  }

  title("ORDER ACTIVITY / HISTORICAL ITEM SNAPSHOTS");
  const orderHeader = [
    { label: "Order / date (PKT)", x: M + 2 },
    { label: "Product / variant", x: M + 173 },
    { label: "Status", x: M + 433 },
    { label: "Qty", x: M + 565, align: "right" as const },
    { label: "Disc.", x: M + 627, align: "right" as const },
    { label: "Net amount", x: W - M - 3, align: "right" as const },
  ];
  tableHeader(orderHeader);
  for (const row of report.lines) {
    if (y + 29 > H - 45) {
      nextPage();
      tableHeader(orderHeader);
    }
    const height = 30;
    draw(fit(row.orderNumber, 160, 7), M + 2, y + 9, 7, true);
    draw(pkt(row.orderedAt), M + 2, y + 21, 7, false, muted);
    draw(
      fit(
        row.hasVariants
          ? `${row.productName} / ${row.variantName}`
          : row.productName,
        240,
        8,
      ),
      M + 173,
      y + 14,
      8,
    );
    draw(
      STATUS[row.status],
      M + 433,
      y + 11,
      8,
      false,
      row.status === "cancelled" ? [174, 45, 68] : ink,
    );
    if (row.status === "cancelled" && row.cancellationReason) {
      draw(
        fit(row.cancellationReason, 126, 6),
        M + 433,
        y + 23,
        6,
        false,
        muted,
      );
    }
    draw(row.quantity, M + 565, y + 14, 8, false, ink, "right");
    draw(`${row.discountPercentage}%`, M + 627, y + 14, 8, false, ink, "right");
    draw(MONEY(row.netPaisa), W - M - 3, y + 14, 8, true, ink, "right");
    line(y + height - 1);
    y += height;
  }
  footer();
  doc.save(`anoosha-sales-${report.startDate}-to-${report.endDate}.pdf`);
}
