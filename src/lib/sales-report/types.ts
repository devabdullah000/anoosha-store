import type { PromotionTargets } from "@/lib/promotions/types";
import type { OrderStatus } from "@/lib/orders/types";

/** Date-only values are interpreted in Pakistan Standard Time (UTC+05:00). */
export type SalesReportRequest = {
  startDate: string;
  endDate: string;
  targets: PromotionTargets;
};

export type SalesReportLine = {
  orderId: string;
  orderNumber: string;
  orderedAt: string;
  status: OrderStatus;
  cancelledAt: string | null;
  cancellationReason: string | null;
  customerName: string;
  productId: string;
  variantId: string;
  categoryId: string | null;
  categoryName: string;
  productName: string;
  variantName: string;
  hasVariants: boolean;
  sku: string;
  quantity: number;
  originalUnitPaisa: number;
  finalUnitPaisa: number;
  discountPercentage: number;
  grossPaisa: number;
  discountPaisa: number;
  netPaisa: number;
};

export type SalesReportBreakdown = {
  status: OrderStatus;
  orders: number;
  units: number;
  grossPaisa: number;
  discountPaisa: number;
  netPaisa: number;
};

export type SalesReportSummary = {
  orders: number;
  lines: number;
  units: number;
  grossPaisa: number;
  discountPaisa: number;
  totalAfterDiscountPaisa: number;
  cancelledPaisa: number;
  netSalesPaisa: number;
  deliveredPaisa: number;
  activeUnits: number;
};

export type SalesProductBreakdown = {
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  categoryName: string;
  hasVariants: boolean;
  sku: string;
  orderCount: number;
  units: number;
  cancelledPaisa: number;
  netSalesPaisa: number;
};

export type SalesCategoryBreakdown = {
  categoryId: string;
  categoryName: string;
  orders: number;
  units: number;
  cancelledPaisa: number;
  netSalesPaisa: number;
};

export type SalesReport = {
  generatedAt: string;
  timeZone: "Asia/Karachi";
  startDate: string;
  endDate: string;
  targets: PromotionTargets;
  summary: SalesReportSummary;
  byStatus: SalesReportBreakdown[];
  byVariant: SalesProductBreakdown[];
  byCategory: SalesCategoryBreakdown[];
  lines: SalesReportLine[];
};
