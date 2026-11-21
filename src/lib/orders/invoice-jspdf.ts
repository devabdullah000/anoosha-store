/**
 * Client-only, on-demand jsPDF invoice generation.
 * Uses the OrderInfo snapshot already loaded for the receipt: ZERO additional
 * API/Worker/D1 calls for PDF generation. Do not import this from a server module.
 */
import type { OrderInfo } from "./types";
import { formatOrderDate } from "./format";

const MONEY = (paisa: number): string =>
  `Rs. ${(paisa / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** jsPDF's built-in Helvetica does not support Urdu and other complex scripts. */
const safePdfText = (value: unknown): string =>
  String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e]/g, "?");

/** Same-origin image load. If not available, use the built-in 'A' monogram. */
async function logoPng(): Promise<string | null> {
  try {
    const img = new Image();
    img.src = "/brand-logo.svg";
    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Logo not available"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 192;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.clearRect(0, 0, 192, 192);
    ctx.drawImage(img, 0, 0, 192, 192);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

export async function downloadOrderInvoicePdf(order: OrderInfo): Promise<void> {
  // Import only after a click. Avoids adding jsPDF to the initial storefront bundle.
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const logo = await logoPng();
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const left = 42;
  const right = W - left;
  const ink: [number, number, number] = [22, 30, 49];
  const muted: [number, number, number] = [95, 105, 120];
  const purple: [number, number, number] = [68, 60, 171];
  const border: [number, number, number] = [223, 227, 234];
  let y = 42;

  const setFont = (size: number, bold = false, color = ink) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const txt = (
    value: unknown,
    x: number,
    atY: number,
    size = 10,
    bold = false,
    color = ink,
    align?: "right" | "center",
  ) => {
    setFont(size, bold, color);
    doc.text(safePdfText(value), x, atY, align ? { align } : undefined);
  };
  const divider = (atY: number) => {
    doc.setDrawColor(...border);
    doc.line(left, atY, right, atY);
  };
  const wrapped = (value: unknown, maxWidth: number, size = 10): string[] => {
    setFont(size);
    return doc.splitTextToSize(safePdfText(value), maxWidth) as string[];
  };
  const newPage = () => {
    doc.addPage();
    y = 56;
    txt(order.storeName.toUpperCase(), left, y, 12, true, purple);
    txt(order.orderNumber, right, y, 9, false, muted, "right");
    y += 16;
    divider(y);
    y += 23;
  };
  const ensure = (height: number) => {
    if (y + height > H - 73) newPage();
  };
  const addWrapped = (
    value: unknown,
    x: number,
    width: number,
    size = 10,
    lineHeight = 15,
    bold = false,
    color = ink,
  ) => {
    const lines = wrapped(value, width, size);
    for (const line of lines) {
      ensure(lineHeight);
      txt(line, x, y, size, bold, color);
      y += lineHeight;
    }
  };

  // Header and actual store logo if it can be loaded from public/brand-logo.svg.
  if (logo) {
    doc.addImage(logo, "PNG", left, y - 5, 54, 54);
  } else {
    doc.setFillColor(...purple);
    doc.roundedRect(left, y - 5, 50, 50, 10, 10, "F");
    txt("A", left + 25, y + 28, 24, true, [255, 255, 255], "center");
  }
  txt(order.storeName.toUpperCase(), 105, y + 15, 17, true);
  txt("ORDER INVOICE", right, y + 15, 12, true, purple, "right");
  const addressLines = wrapped(order.storeAddress, W - 260, 9);
  addressLines
    .slice(0, 3)
    .forEach((line, idx) => txt(line, 105, y + 32 + idx * 12, 9, false, muted));
  y += 75;
  divider(y);
  y += 24;
  txt(`Invoice: ${order.orderNumber}`, left, y, 11, true);
  txt(
    `Status: ${order.status.toUpperCase()}`,
    right,
    y,
    10,
    true,
    purple,
    "right",
  );
  y += 19;
  txt(`Placed: ${formatOrderDate(order.createdAt)}`, left, y, 9, false, muted);
  y += 35;

  txt("DELIVER TO", left, y, 10, true, purple);
  y += 18;
  addWrapped(order.customerName, left, 510, 11, 16, true);
  addWrapped(order.addressLine1, left, 510, 10, 15);
  if (order.addressLine2) addWrapped(order.addressLine2, left, 510, 10, 15);
  addWrapped(
    `${order.city}, ${order.province}${order.postalCode ? ` ${order.postalCode}` : ""}, ${order.country}`,
    left,
    510,
    10,
    15,
  );
  addWrapped(
    `Contact: ${order.phone}  |  Email: ${order.userEmail}`,
    left,
    510,
    9,
    14,
    false,
    muted,
  );
  y += 22;
  ensure(56);
  divider(y);
  y += 25;
  txt("PRODUCT / VARIANT / OPTIONS", left, y, 8, true, muted);
  txt("QTY", 296, y, 8, true, muted, "right");
  txt("GROSS", 376, y, 8, true, muted, "right");
  txt("SAVED", 458, y, 8, true, muted, "right");
  txt("NET", right, y, 8, true, muted, "right");
  y += 12;
  divider(y);
  y += 19;

  for (const item of order.items) {
    // Draw the product description in a column independent from numeric totals.
    const description = [item.name];
    if (item.hasVariants)
      description.push(`Variant: ${item.variantName} | SKU: ${item.sku}`);
    for (const selection of item.selections)
      description.push(`${selection.name}: ${selection.values.join(", ")}`);
    description.push(
      `Unit: ${MONEY(item.originalUnitPaisa)} | ${item.appliedPromotionName ? `${safePdfText(item.appliedPromotionName)} promotion` : "Individual"} ${item.discountPercentage}% | Net: ${MONEY(item.finalUnitPaisa)}`,
    );
    const rows = description.flatMap((line, idx) =>
      wrapped(line, 226, idx === 0 ? 10 : 8.5),
    );
    const rowH = Math.max(rows.length * 14 + 12, 43);
    ensure(Math.min(rowH, H - 140));
    const startY = y;
    txt(String(item.quantity), 296, y, 9, true, ink, "right");
    txt(MONEY(item.grossPaisa), 376, y, 8.5, false, ink, "right");
    txt(MONEY(item.discountPaisa), 458, y, 8.5, false, ink, "right");
    txt(MONEY(item.netPaisa), right, y, 8.5, true, ink, "right");
    for (let idx = 0; idx < rows.length; idx++) {
      if (y + 14 > H - 73) newPage();
      txt(
        rows[idx],
        left,
        y,
        idx === 0 ? 10 : 8.5,
        idx === 0,
        idx === 0 ? ink : muted,
      );
      y += 14;
    }
    y = Math.max(y, startY + 31) + 9;
    ensure(20);
    divider(y);
    y += 20;
  }

  ensure(155);
  const summaryLeft = right - 177;
  const totalRow = (
    label: string,
    paisa: number,
    bold = false,
    color = ink,
  ) => {
    txt(label, summaryLeft, y, bold ? 11 : 10, bold, color);
    txt(MONEY(paisa), right, y, bold ? 11 : 10, bold, color, "right");
    y += bold ? 25 : 21;
  };
  totalRow("Gross amount", order.grossPaisa);
  totalRow("Discount savings", -order.discountPaisa);
  totalRow("Shipping", order.shippingPaisa);
  divider(y - 7);
  y += 14;
  totalRow("GRAND TOTAL", order.totalPaisa, true, purple);
  y += 6;
  txt("Payment: Cash on delivery (COD)", left, y, 9, false, muted);
  y += 20;
  if (order.status === "cancelled" && order.cancellationReason) {
    addWrapped(
      `Cancellation reason: ${order.cancellationReason}`,
      left,
      right - left,
      9,
      14,
      false,
      muted,
    );
  }

  const count = doc.getNumberOfPages();
  for (let page = 1; page <= count; page++) {
    doc.setPage(page);
    doc.setDrawColor(...border);
    doc.line(left, H - 42, right, H - 42);
    txt(
      `Anoosha Store  |  ${order.orderNumber}`,
      left,
      H - 26,
      8,
      false,
      muted,
    );
    txt(`Page ${page} of ${count}`, right, H - 26, 8, false, muted, "right");
  }
  doc.setProperties({
    title: `Invoice ${order.orderNumber}`,
    subject: `Order receipt - ${order.storeName}`,
    author: order.storeName,
    creator: "Anoosha Store Orders",
  });
  doc.save(`${order.orderNumber}.pdf`);
}
