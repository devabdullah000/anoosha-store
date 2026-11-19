import type { PageInfo, StoreVariant, VariantAttribute } from './types';
import { STORE_URL } from '../constants';
import type { AttributeChoice } from './types';

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || STORE_URL
).replace(/\/+$/, '');

export function pagination(page: number, limit: number, total: number): PageInfo {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(Math.max(1, page), totalPages);
  return {
    page: safePage,
    limit,
    total,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
  };
}

export function asPage(value: string | null | undefined): number {
  const n = Number(value);
  return Number.isSafeInteger(n) && n > 0 ? Math.min(n, 100000) : 1;
}

export function asLimit(value: string | null | undefined): number {
  return [10, 20, 50].includes(Number(value)) ? Number(value) : 10;
}

export function pricePaisa(
  variant: Pick<StoreVariant, 'salePrice' | 'hasDiscount' | 'discountPercentage'>,
): number {
  return variant.hasDiscount
    ? Math.round((variant.salePrice * (100 - variant.discountPercentage)) / 100)
    : variant.salePrice;
}

export function money(paisa: number): string {
  return `Rs. ${(paisa / 100).toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function descriptionPreview(
  shortDescription: string | null,
  description: string,
): { text: string; truncated: boolean } {
  if (shortDescription?.trim()) {
    return { text: shortDescription.trim(), truncated: false };
  }
  const clean = description.replace(/\s+/g, ' ').trim();
  return clean.length > 58
    ? { text: `${clean.slice(0, 55).trimEnd()}...`, truncated: true }
    : { text: clean, truncated: false };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeValue(input: string): unknown {
  let value: unknown = input.trim();

  // Some existing admin forms may have JSON-stringified a JSON string.
  for (let attempt = 0; attempt < 2; attempt++) {
    if (typeof value !== 'string') break;
    const text = value.trim();
    if (!text.startsWith('{') && !text.startsWith('[') && !text.startsWith('"')) {
      break;
    }
    try {
      value = JSON.parse(text) as unknown;
    } catch {
      // Avoid accidentally rendering the entire JSON payload as a choice.
      return text.startsWith('{') || text.startsWith('[') ? null : text;
    }
  }

  return value;
}

function availableQuantity(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Supports existing TEXT values without changing the D1 schema:
 *
 * - 'Black'
 * - '["Black","White"]'
 * - '{"kind":"dropdown","options":[{"label":"medium","quantity":3},...]}'
 * - Optional double-encoded JSON from earlier admin forms
 *
 * A quantity of zero means the option must not be selectable.
 */
export function attributeChoices(attribute: VariantAttribute): AttributeChoice[] {
  const decoded = decodeValue(attribute.value);
  let items: unknown[];

  if (Array.isArray(decoded)) {
    if (
      decoded.length === 1 &&
      isRecord(decoded[0]) &&
      Array.isArray(decoded[0].options)
    ) {
      items = decoded[0].options;
    } else {
      items = decoded;
    }
  } else if (isRecord(decoded) && Array.isArray(decoded.options)) {
    items = decoded.options;
  } else if (decoded === null || decoded === undefined) {
    items = [];
  } else {
    items = [decoded];
  }

  const unique = new Set<string>();
  const choices: AttributeChoice[] = [];

  for (const item of items) {
    let label = '';
    let quantity: number | null = null;
    let color: string | null = null;

    if (typeof item === 'string' || typeof item === 'number') {
      label = String(item).trim();
    } else if (isRecord(item)) {
      if (typeof item.label === 'string') {
        label = item.label.trim();
      } else if (typeof item.value === 'string') {
        label = item.value.trim();
      }
      quantity = availableQuantity(item.quantity);
      color = typeof item.color === 'string'
        ? item.color.trim()
        : typeof item.hex === 'string'
          ? item.hex.trim()
          : typeof item.value === 'string'
            ? item.value.trim()
            : null;
    }

    if (!label || unique.has(label)) continue;
    unique.add(label);
    choices.push({ label, quantity, color });
    if (choices.length >= 30) break;
  }

  return choices;
}

/** Retained for existing code that expects just the labels. */
export function attributeOptions(attribute: VariantAttribute): string[] {
  return attributeChoices(attribute).map((choice) => choice.label);
}

export function productHref(productId: string): string {
  return `/product/${encodeURIComponent(productId)}`;
}

export function categoryHref(categoryId: string): string {
  return `/shop/category/${encodeURIComponent(categoryId)}`;
}

export function canonical(path: string): string {
  return `${SITE_URL}${path}`;
}
