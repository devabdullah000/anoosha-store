import "server-only";
import type {
  AttributeDefinition,
  DraftImage,
  DraftVariant,
  ProductAttributeValue,
  ProductDraft,
} from "../../components/admin/products/product-types";

export class ProductInputError extends Error {}
const obj = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown, max: number, required = true): string => {
  if (typeof v !== "string") throw new ProductInputError("A required text field is missing or invalid.");
  const trimmed = v.trim();
  if ((required && !trimmed) || trimmed.length > max) {
    throw new ProductInputError(`Text must ${required ? "not be empty and " : ""}contain at most ${max} characters.`);
  }
  return trimmed;
};
const optional = (v: unknown, max: number): string | null =>
  v == null || v === "" ? null : string(v, max, false) || null;
const bool = (v: unknown, field: string): boolean => {
  if (typeof v !== "boolean") throw new ProductInputError(`${field} must be true or false.`);
  return v;
};
const whole = (v: unknown, field: string, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  if (!Number.isSafeInteger(v) || (v as number) < min || (v as number) > max) {
    throw new ProductInputError(`${field} must be an integer between ${min} and ${max}.`);
  }
  return v as number;
};
const id = (v: unknown, field: string): string => {
  try { return string(v, 160); }
  catch { throw new ProductInputError(`${field} is missing or invalid.`); }
};

function parseImage(value: unknown): DraftImage {
  if (!obj(value)) throw new ProductInputError("Invalid image entry.");
  const hasId = value.id !== undefined;
  const hasUpload = value.uploadId !== undefined;
  if (hasId === hasUpload) throw new ProductInputError("Each image must have either a saved ID or a new upload ID.");
  return {
    ...(hasId ? { id: id(value.id, "Image ID") } : { uploadId: id(value.uploadId, "Upload ID") }),
    isPrimary: bool(value.isPrimary, "isPrimary"),
  };
}

export function parseProductDraft(raw: unknown): ProductDraft {
  if (!obj(raw)) throw new ProductInputError("Invalid product payload.");
  const name = string(raw.name, 120);
  const categoryId = id(raw.categoryId, "Category ID");
  const status = bool(raw.status, "Product status");
  const hasVariants = bool(raw.hasVariants, "Variant mode");
  if (!Array.isArray(raw.variants) || !raw.variants.length || raw.variants.length > 20) {
    throw new ProductInputError("A product requires 1 to 20 variants.");
  }
  if (hasVariants !== (raw.variants.length >= 2)) {
    throw new ProductInputError("Variant mode must be enabled for two or more variants.");
  }
  const names = new Set<string>();
  const skus = new Set<string>();
  const existingVariantIds = new Set<string>();
  const imageIds = new Set<string>();
  const uploadIds = new Set<string>();
  let totalImages = 0;
  let defaultCount = 0;

  const variants: DraftVariant[] = raw.variants.map((entry, index) => {
    if (!obj(entry)) throw new ProductInputError(`Variant ${index + 1} is invalid.`);
    const variantName = string(entry.name, 120);
    const duplicateName = variantName.toLocaleLowerCase("en-US");
    if (names.has(duplicateName)) throw new ProductInputError("Variant names must be unique within a product.");
    names.add(duplicateName);
    const sku = string(entry.sku, 80);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(sku)) {
      throw new ProductInputError("SKUs may contain letters, numbers, dots, hyphens, and underscores.");
    }
    if (skus.has(sku.toLowerCase())) throw new ProductInputError("Variant SKUs must be unique.");
    skus.add(sku.toLowerCase());
    const existingId = entry.id === undefined ? undefined : id(entry.id, "Variant ID");
    if (existingId && existingVariantIds.has(existingId)) throw new ProductInputError("Duplicate variant ID.");
    if (existingId) existingVariantIds.add(existingId);
    const stock = whole(entry.stock, `Variant ${index + 1} stock`);
    const hasDiscount = bool(entry.hasDiscount, "hasDiscount");
    const discountPercentage = whole(entry.discountPercentage, "Discount percent", 0, 99);
    if (hasDiscount ? discountPercentage < 1 : discountPercentage !== 0) {
      throw new ProductInputError("Discount must be 1–99% when enabled, otherwise zero.");
    }
    const isDefault = bool(entry.isDefault, "isDefault");
    if (isDefault) defaultCount++;
    if (!Array.isArray(entry.images) || entry.images.length > 5) {
      throw new ProductInputError("Each variant allows at most 5 images.");
    }
    const images = entry.images.map(parseImage);
    totalImages += images.length;
    if (images.length && images.filter((image) => image.isPrimary).length !== 1) {
      throw new ProductInputError(`Variant ${variantName} must have exactly one primary image.`);
    }
    for (const image of images) {
      const key = image.id ?? image.uploadId!;
      const set = image.id ? imageIds : uploadIds;
      if (set.has(key)) throw new ProductInputError("Duplicate image entry.");
      set.add(key);
    }
    if (!Array.isArray(entry.attributes)) throw new ProductInputError("Variant attributes must be a list.");
    const attributeIds = new Set<string>();
    const attributes = entry.attributes.map((value): ProductAttributeValue => {
      if (!obj(value)) throw new ProductInputError("Invalid attribute assignment.");
      const attributeId = id(value.attributeId, "Attribute ID");
      if (attributeIds.has(attributeId)) throw new ProductInputError("Each attribute may only appear once per variant.");
      attributeIds.add(attributeId);
      if (value.kind === "dropdown") {
        if (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 50) {
          throw new ProductInputError("Dropdown attributes require 2–50 options.");
        }
        const unique = new Set<string>();
        let sum = 0;
        const options = value.options.map((item) => {
          if (!obj(item)) throw new ProductInputError("Invalid dropdown option.");
          const label = string(item.label, 100);
          const duplicate = label.toLowerCase();
          if (unique.has(duplicate)) throw new ProductInputError("Dropdown values must be unique.");
          unique.add(duplicate);
          const quantity = whole(item.quantity, "Dropdown option quantity");
          sum += quantity;
          return { label, quantity };
        });
        if (sum > stock) throw new ProductInputError(`Dropdown quantities for ${variantName} cannot exceed its stock.`);
        return { attributeId, kind: "dropdown", options };
      }
      if (value.kind === "button" || value.kind === "color") {
        if (!Array.isArray(value.values) || !value.values.length || value.values.length > 50) {
          throw new ProductInputError("Button/color attributes require 1–50 values.");
        }
        const values = value.values.map((v) => string(v, 100));
        if (new Set(values.map((v) => v.toLowerCase())).size !== values.length) {
          throw new ProductInputError("Attribute values must be unique.");
        }
        if (value.kind === "color" && values.some((v) => !/^#[0-9a-fA-F]{6}$/.test(v))) {
          throw new ProductInputError("Color values must be six-digit hex colors (e.g. #FF0000).");
        }
        return { attributeId, kind: value.kind, values };
      }
      throw new ProductInputError("Unknown attribute display type.");
    });
    return {
      ...(existingId ? { id: existingId } : {}),
      name: variantName,
      description: string(entry.description, 4000),
      shortDescription: optional(entry.shortDescription, 500),
      sku,
      salePrice: whole(entry.salePrice, "Sale price"),
      purchasePrice: whole(entry.purchasePrice, "Purchase price"),
      hasDiscount,
      discountPercentage,
      tag: optional(entry.tag, 80),
      isDefault,
      status: bool(entry.status, "Variant status"),
      stock,
      images,
      attributes,
    };
  });
  if (defaultCount !== 1) throw new ProductInputError("Exactly one variant must be marked as default.");
  if (totalImages === 0) throw new ProductInputError("A product requires at least one image.");
  const expectedUpdatedAt = raw.expectedUpdatedAt === undefined
    ? undefined : string(raw.expectedUpdatedAt, 80);
  return { ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}), name, categoryId, status, hasVariants, variants };
}

/** Attribute display definitions belong to the Attributes CRUD, not the product editor. */
export function validateAttributeDefinitions(
  draft: ProductDraft,
  definitions: AttributeDefinition[],
) {
  const byId = new Map(definitions.map((item) => [item.id, item]));
  for (const variant of draft.variants) {
    for (const assignment of variant.attributes) {
      const attribute = byId.get(assignment.attributeId);
      if (!attribute) throw new ProductInputError("An assigned attribute no longer exists.");
      if (attribute.displayType !== assignment.kind) {
        throw new ProductInputError(`Attribute ${attribute.name} must use its configured ${attribute.displayType} display type.`);
      }
      if (attribute.valueType === "number") {
        const vals = assignment.kind === "dropdown" ? assignment.options.map((v) => v.label) : assignment.values;
        if (vals.some((v) => !Number.isFinite(Number(v)))) {
          throw new ProductInputError(`${attribute.name} requires numeric values.`);
        }
      } else if (attribute.valueType === "boolean") {
        const vals = assignment.kind === "dropdown" ? assignment.options.map((v) => v.label) : assignment.values;
        if (vals.some((v) => !["true", "false"].includes(v.toLowerCase()))) {
          throw new ProductInputError(`${attribute.name} requires true/false values.`);
        }
      } else if (attribute.valueType === "color") {
        const vals = assignment.kind === "dropdown" ? assignment.options.map((v) => v.label) : assignment.values;
        if (vals.some((v) => !/^#[\da-fA-F]{6}$/.test(v))) {
          throw new ProductInputError(`${attribute.name} requires #RRGGBB color values.`);
        }
      }
    }
  }
}
