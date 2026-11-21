import type { NotificationVariant } from "@/components/storefront/notification-popup";
import type { PromotionTargets } from "@/lib/promotions/types";

// Re-export the existing domain types; do not fork or redefine backend contracts.
export type {
  CatalogPage,
  CatalogProduct,
  CategoryTarget,
  Page,
  ProductTarget,
  PromotionDetail,
  PromotionListRow,
  PromotionScope,
  PromotionTargets,
} from "@/lib/promotions/types";

export type PromotionEditor = {
  id?: string;
  wasActive?: boolean;
  name: string;
  description: string;
  discountPercentage: number;
  isActive: boolean;
  targets: PromotionTargets;
};

export type PromotionAlert = {
  title: string;
  description: string;
  variant: NotificationVariant;
};

export type PromotionApiResult<T> = {
  success: boolean;
  message?: string;
  data?: T;
};

export type PromotionFormProps = {
  editor: PromotionEditor;
  saving: boolean;
  onChange: (updater: (old: PromotionEditor) => PromotionEditor) => void;
  onClose: () => void;
  onSave: () => void;
  onNotify: (
    title: string,
    description: string,
    variant?: NotificationVariant,
  ) => void;
};
