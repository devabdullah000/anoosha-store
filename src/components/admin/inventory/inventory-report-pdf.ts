/**
 * Client-only, on-demand PDF export of a complete filtered inventory report.
 *
 * Requires: npm install jspdf
 *
 * Uses PDF owner permissions to disallow editing, copying and form changes in
 * compliant PDF readers. Such permissions are NOT tamper-proof: determined
 * recipients can use software that ignores or removes PDF restrictions.
 */

import type {
  InventoryMovementRow,
  InventoryOperationType,
} from "./inventory-types";

export type InventoryReportFilters = {
  fromDate: string;
  toDate: string;
  type: "all" | InventoryOperationType;
  products: { id: string; name: string }[];
  search: string;
};

export type InventoryPdfInput = {
  filters: InventoryReportFilters;
  rows: InventoryMovementRow[];
  generatedAt: Date;
};

const typeNames: Record<InventoryOperationType | "initial", string> = {
  purchase: "Purchase",
  increase: "Increase",
  decrease: "Decrease",
  initial: "Initial stock",
};

// Standard jsPDF fonts do not include all Unicode characters. Preserve common
// Latin accents where possible; replace characters the font cannot render.
function pdfText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[^\x20-\x7e\n]/g, "?");
}

function formatMovementDate(value: string) {
  const instant = new Date(
    value.includes("T") ? value : `${value.replace(" ", "T")}Z`,
  );
  return Number.isNaN(instant.getTime())
    ? value
    : instant.toLocaleString("en-PK", {
        dateStyle: "short",
        timeStyle: "short",
      });
}

function safeFilenameDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "unknown";
}

export async function downloadInventoryReportPdf({
  filters,
  rows,
  generatedAt,
}: InventoryPdfInput): Promise<void> {
  // Imported only after clicking Download so the JS/PDF library does not load
  // when the admin opens the Inventory panel.
  const { jsPDF } = await import("jspdf");

  // The owner key is not exposed to users; normal opening needs no password.
  // This is an edit restriction, not a security proof or digital signature.
  const ownerPassword = [crypto.randomUUID(), crypto.randomUUID()].join("");
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
    compress: true,
    encryption: {
      userPassword: "",
      ownerPassword,
      userPermissions: ["print"],
    },
  });

  doc.setProperties({
    title: "Anoosha Store - Inventory Movement Report",
    subject: `Inventory audit ${filters.fromDate} to ${filters.toDate}`,
    author: "Anoosha Store",
    creator: "Anoosha Store Inventory",
    keywords: "Inventory, purchase, stock movement, audit",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const left = 34;
  const right = pageWidth - 34;
  const tableWidth = right - left;
  const tableColumns = [
    { key: "product", label: "PRODUCT / VARIANT / SKU", width: 183 },
    { key: "type", label: "ACTIVITY", width: 77 },
    { key: "before", label: "BEFORE", width: 45 },
    { key: "change", label: "CHANGE", width: 45 },
    { key: "after", label: "AFTER", width: 45 },
    { key: "reference", label: "REFERENCE / NOTES", width: 245 },
    { key: "date", label: "DATE", width: tableWidth - 640 },
  ] as const;
  const yTableHeader = 168;
  let currentY = yTableHeader;

  const purchases = rows.reduce(
    (sum, item) => sum + (item.type === "purchase" ? item.qtyDiff : 0),
    0,
  );
  const increases = rows.reduce(
    (sum, item) => sum + (item.type === "increase" ? item.qtyDiff : 0),
    0,
  );
  const decreases = rows.reduce(
    (sum, item) =>
      sum + (item.type === "decrease" ? Math.abs(item.qtyDiff) : 0),
    0,
  );

  function drawTop() {
    doc.setFillColor(16, 24, 40);
    doc.rect(0, 0, pageWidth, 57, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("ANOOSHA STORE", left, 28);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text("INVENTORY MOVEMENT REPORT", left, 44);
    doc.text("READ-ONLY EXPORT", right, 28, { align: "right" });

    doc.setTextColor(39, 50, 70);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Period", left, 77);
    doc.text("Activity", left + 220, 77);
    doc.text("Products", left + 420, 77);
    doc.setFont("helvetica", "normal");
    doc.text(pdfText(`${filters.fromDate} to ${filters.toDate}`), left, 90);
    doc.text(
      pdfText(
        filters.type === "all" ? "All activities" : typeNames[filters.type],
      ),
      left + 220,
      90,
    );
    const productLabel = filters.products.length
      ? `${filters.products.length} selected: ${filters.products.map((p) => p.name).join(", ")}`
      : "All products";
    const shownProduct = doc
      .splitTextToSize(pdfText(productLabel), 280)
      .slice(0, 2);
    doc.text(shownProduct, left + 420, 90);

    doc.setTextColor(95, 107, 128);
    doc.setFontSize(8);
    doc.text(
      pdfText(`Search: ${filters.search || "None"}`.slice(0, 150)),
      left,
      115,
    );
    doc.text(`Generated: ${generatedAt.toLocaleString("en-PK")}`, right, 115, {
      align: "right",
    });
    doc.setFont("helvetica", "bold");
    doc.setTextColor(37, 55, 86);
    doc.setFontSize(9);
    doc.text(
      `Movements: ${rows.length}    Purchases: +${purchases}    Manual increases: +${increases}    Manual decreases: -${decreases}`,
      left,
      136,
    );

    doc.setFillColor(238, 242, 250);
    doc.rect(left, yTableHeader, tableWidth, 28, "F");
    doc.setTextColor(66, 79, 105);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    let x = left;
    for (const column of tableColumns) {
      doc.text(column.label, x + 5, yTableHeader + 18);
      x += column.width;
    }
    currentY = yTableHeader + 28;
  }

  drawTop();
  for (let index = 0; index < rows.length; index++) {
    const item = rows[index];
    const product = item.hasVariants
      ? `${item.productName} / ${item.variantName}\nSKU: ${item.sku}`
      : `${item.productName}\nSKU: ${item.sku}`;
    const notes = [
      item.reference || "-",
      item.documentNote || item.note || "",
      item.createdBy || "",
    ]
      .filter(Boolean)
      .join("\n");
    const values = [
      product,
      typeNames[item.type],
      String(item.previousQty),
      item.qtyDiff > 0 ? `+${item.qtyDiff}` : String(item.qtyDiff),
      String(item.newQty),
      notes,
      formatMovementDate(item.createdAt),
    ];

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    // Preserve complete line information rather than truncating invoice notes.
    const cellLines = values.map((value, cellIndex) => {
      const wrapped = doc.splitTextToSize(
        pdfText(value),
        tableColumns[cellIndex].width - 12,
      ) as string[];
      return wrapped.length ? wrapped : [""];
    });
    const lineCount = Math.max(...cellLines.map((lines) => lines.length));
    const rowHeight = Math.max(27, lineCount * 10 + 13);

    if (currentY + rowHeight > pageHeight - 45) {
      doc.addPage();
      drawTop();
    }
    if (index % 2 === 1) {
      doc.setFillColor(249, 250, 253);
      doc.rect(left, currentY, tableWidth, rowHeight, "F");
    }
    doc.setDrawColor(232, 236, 244);
    doc.line(left, currentY + rowHeight, right, currentY + rowHeight);

    let x = left;
    for (let c = 0; c < tableColumns.length; c++) {
      const column = tableColumns[c];
      const numeric = c >= 2 && c <= 4;
      doc.setTextColor(
        c === 3 && item.qtyDiff < 0 ? 170 : 39,
        c === 3 && item.qtyDiff < 0 ? 45 : 50,
        65,
      );
      doc.setFont("helvetica", c === 0 ? "bold" : "normal");
      doc.text(
        cellLines[c],
        numeric ? x + column.width - 6 : x + 6,
        currentY + 13,
        {
          align: numeric ? "right" : "left",
        },
      );
      x += column.width;
    }
    currentY += rowHeight;
  }

  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p);
    doc.setDrawColor(224, 229, 239);
    doc.line(left, pageHeight - 34, right, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(109, 120, 140);
    doc.text(
      "Inventory audit | Editing restricted in compatible PDF viewers",
      left,
      pageHeight - 21,
    );
    doc.text(`Page ${p} of ${pages}`, right, pageHeight - 21, {
      align: "right",
    });
  }

  const filename = `anoosha-inventory-${safeFilenameDate(filters.fromDate)}-to-${safeFilenameDate(filters.toDate)}.pdf`;
  doc.save(filename);
}
