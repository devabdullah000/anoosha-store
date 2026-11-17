import type {
  Product,
  ProductAttributeValue,
  ProductDraft,
  ProductImage,
} from "./product-types";

export type EditorImage = {
  clientId: string;
  id?: string;
  uploadId?: string;
  isPrimary: boolean;
  url: string;
  file?: File;
};
export type EditorVariant = {
  clientId: string;
  id?: string;
  name: string;
  description: string;
  shortDescription: string;
  sku: string;
  salePriceText: string;
  purchasePriceText: string;
  hasDiscount: boolean;
  discountPercentage: number;
  tag: string;
  isDefault: boolean;
  status: boolean;
  stock: number;
  images: EditorImage[];
  attributes: ProductAttributeValue[];
};
export type EditorProduct = {
  expectedUpdatedAt?: string;
  name: string;
  categoryId: string;
  status: boolean;
  variants: EditorVariant[];
};
export const blankVariant = (isDefault = false): EditorVariant => ({
  clientId: crypto.randomUUID(),
  name: isDefault ? "Default" : "",
  description: "",
  shortDescription: "",
  sku: "",
  salePriceText: "",
  purchasePriceText: "",
  hasDiscount: false,
  discountPercentage: 0,
  tag: "",
  isDefault,
  status: true,
  stock: 0,
  images: [],
  attributes: [],
});
export const blankProduct = (): EditorProduct => ({
  name: "", categoryId: "", status: true,
  variants: [blankVariant(true)],
});
export function fromProduct(product: Product): EditorProduct {
  return {
    expectedUpdatedAt: product.updatedAt,
    name: product.name,
    categoryId: product.categoryId,
    status: product.status,
    variants: product.variants.map((v) => ({
      clientId: v.id,
      id: v.id,
      name: v.name,
      description: v.description,
      shortDescription: v.shortDescription ?? "",
      sku: v.sku,
      salePriceText: (v.salePrice / 100).toFixed(2),
      purchasePriceText: (v.purchasePrice / 100).toFixed(2),
      hasDiscount: v.hasDiscount,
      discountPercentage: v.discountPercentage,
      tag: v.tag ?? "",
      isDefault: v.isDefault,
      status: v.status,
      stock: v.stock,
      images: v.images.map((image: ProductImage) => ({
        clientId: image.id,
        id: image.id,
        isPrimary: image.isPrimary,
        url: image.url,
      })),
      attributes: v.attributes,
    })),
  };
}
function toPaisa(value: string, label: string) {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/.test(value.trim())) {
    throw new Error(`${label} must be a non-negative PKR amount with up to 2 decimal places.`);
  }
  const [rupees, decimals = ""] = value.trim().split(".");
  const amount = Number(rupees) * 100 + Number((decimals + "00").slice(0, 2));
  if (!Number.isSafeInteger(amount)) throw new Error(`${label} is too large.`);
  return amount;
}
export function serializeProduct(editor: EditorProduct): ProductDraft {
  if (!editor.name.trim() || editor.name.trim().length > 120) {
    throw new Error("Enter a product name (up to 120 characters).");
  }
  if (!editor.categoryId) throw new Error("Choose a category.");
  if (editor.variants.length < 1 || editor.variants.length > 20) {
    throw new Error("Products support 1–20 variants.");
  }
  if (!editor.variants.some((v) => v.images.length > 0)) {
    throw new Error("Every product requires at least one image.");
  }
  if (editor.variants.filter((v) => v.isDefault).length !== 1) {
    throw new Error("Choose exactly one default variant.");
  }

  const names = new Set<string>();
  const skus = new Set<string>();
  let totalUploadBytes = 0;
  for (const v of editor.variants) {
    if (!v.name.trim() || !v.sku.trim() || !v.description.trim()) {
      throw new Error("Every variant requires a name, SKU and description.");
    }
    if (v.name.trim().length > 120 || v.description.trim().length > 4000) {
      throw new Error("Variant name or description is too long.");
    }
    const normalizedName = v.name.trim().toLowerCase();
    const normalizedSku = v.sku.trim().toLowerCase();
    if (names.has(normalizedName)) throw new Error("Variant names must be unique within the product.");
    if (skus.has(normalizedSku)) throw new Error("Each variant needs a different SKU.");
    names.add(normalizedName);
    skus.add(normalizedSku);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(v.sku.trim()) || v.sku.trim().length > 80) {
      throw new Error("SKU may contain only letters, numbers, dots, underscores and hyphens.");
    }
    if (!Number.isSafeInteger(v.stock) || v.stock < 0) {
      throw new Error("Stock must be a non-negative whole number.");
    }
    if (v.images.length > 5) throw new Error("Each variant supports at most five images.");
    if (v.images.length && v.images.filter((i) => i.isPrimary).length !== 1) {
      throw new Error("Set exactly one primary image for each variant with images.");
    }
    for (const image of v.images) {
      if (image.file) totalUploadBytes += image.file.size;
      if (!image.id && (!image.file || !image.uploadId)) {
        throw new Error("A selected image file is missing. Remove and select it again.");
      }
    }
    if (v.hasDiscount && (!Number.isInteger(v.discountPercentage) || v.discountPercentage < 1 || v.discountPercentage > 99)) {
      throw new Error("Discount percentage must be between 1 and 99.");
    }
    const attrIds = new Set<string>();
    for (const attr of v.attributes) {
      if (attrIds.has(attr.attributeId)) throw new Error("An attribute can be assigned only once to a variant.");
      attrIds.add(attr.attributeId);
      if (attr.kind === "dropdown") {
        if (attr.options.length < 2 || attr.options.length > 50) {
          throw new Error("Dropdown attributes need between 2 and 50 options.");
        }
        const options = new Set<string>();
        for (const option of attr.options) {
          if (!option.label.trim() || option.label.trim().length > 100 ||
              !Number.isSafeInteger(option.quantity) || option.quantity < 0) {
            throw new Error("Complete every dropdown option and its non-negative integer quantity.");
          }
          const key = option.label.trim().toLowerCase();
          if (options.has(key)) throw new Error("Dropdown options must have distinct values.");
          options.add(key);
        }
        if (attr.options.reduce((sum, option) => sum + option.quantity, 0) > v.stock) {
          throw new Error("Dropdown option quantities cannot exceed this variant's stock.");
        }
      } else {
        if (!attr.values.length || attr.values.length > 50 || attr.values.some((value) => !value.trim() || value.trim().length > 100)) {
          throw new Error("Button and color attributes need 1–50 complete values.");
        }
        if (new Set(attr.values.map((value) => value.trim().toLowerCase())).size !== attr.values.length) {
          throw new Error("Attribute values must be unique.");
        }
        if (attr.kind === "color" && attr.values.some((value) => !/^#[0-9a-f]{6}$/i.test(value))) {
          throw new Error("Color values must use six-digit hex codes, e.g. #FF0088.");
        }
      }
    }
  }
  if (totalUploadBytes > 40 * 1024 * 1024) {
    throw new Error("A product save can upload at most 40 MB of new images.");
  }

  return {
    ...(editor.expectedUpdatedAt ? { expectedUpdatedAt: editor.expectedUpdatedAt } : {}),
    name: editor.name.trim(), categoryId: editor.categoryId, status: editor.status,
    hasVariants: editor.variants.length > 1,
    variants: editor.variants.map((v) => ({
      ...(v.id ? { id: v.id } : {}),
      name: v.name.trim(), description: v.description.trim(),
      shortDescription: v.shortDescription.trim() || null,
      sku: v.sku.trim(),
      salePrice: toPaisa(v.salePriceText, `${v.name} sale price`),
      purchasePrice: toPaisa(v.purchasePriceText, `${v.name} purchase price`),
      hasDiscount: v.hasDiscount,
      discountPercentage: v.hasDiscount ? v.discountPercentage : 0,
      tag: v.tag.trim() || null,
      isDefault: v.isDefault, status: v.status, stock: v.stock,
      images: v.images.map((img) => ({
        ...(img.id ? { id: img.id } : { uploadId: img.uploadId! }),
        isPrimary: img.isPrimary,
      })),
      attributes: v.attributes,
    })),
  };
}
