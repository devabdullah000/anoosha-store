import { attributeChoices } from "@/lib/storefront/utils";
import type { CartSelection, CartAttribute } from "./types";

export type ValidateResult =
  | { ok: true; normalized: CartSelection[] }
  | { ok: false; message: string };
const fail = (message: string): ValidateResult => ({ ok: false, message });

/** Shared pure validation for client UI and server. Does NOT reserve stock. */
export function validateCartSelection(
  quantity: number,
  selections: unknown,
  attributes: CartAttribute[],
  stock: number,
): ValidateResult {
  if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99)
    return fail("Quantity must be a whole number from 1 to 99.");
  if (!Number.isSafeInteger(stock) || stock < 0)
    return fail("Product stock information is unavailable.");
  if (quantity > stock)
    return fail(
      `Only ${stock} unit${stock === 1 ? "" : "s"} are currently available for this variant.`,
    );
  if (!Array.isArray(selections) || selections.length > 30)
    return fail("Invalid attribute selections.");

  const byId = new Map<string, string[]>();
  for (const entry of selections) {
    if (!entry || typeof entry !== "object")
      return fail("Invalid attribute selections.");
    const input = entry as { attributeId?: unknown; values?: unknown };
    if (
      typeof input.attributeId !== "string" ||
      !Array.isArray(input.values) ||
      byId.has(input.attributeId)
    )
      return fail("Invalid or duplicate attribute selection.");
    if (input.values.some((v) => typeof v !== "string" || v.length > 200))
      return fail("Invalid attribute option.");
    byId.set(input.attributeId, input.values as string[]);
  }
  const dropdowns = attributes.filter((a) => a.displayType === "dropdown");
  if (
    byId.size !== dropdowns.length ||
    [...byId.keys()].some((k) => !dropdowns.some((a) => a.id === k))
  ) {
    return fail(
      "Please provide selections for all and only required dropdown attributes.",
    );
  }
  const normalized: CartSelection[] = [];
  for (const a of dropdowns) {
    const values = byId.get(a.id) ?? [];
    if (!values.length)
      return fail(`Please choose at least one ${a.name.toLowerCase()} option.`);
    if (values.length > quantity)
      return fail(
        `You selected ${values.length} ${a.name.toLowerCase()} options but quantity is ${quantity}. Increase the quantity or remove an option.`,
      );
    if (new Set(values).size !== values.length)
      return fail(`Duplicate ${a.name.toLowerCase()} options are not allowed.`);
    const options = attributeChoices(a);
    const selectedOptions = values.map((value) =>
      options.find((o) => o.label === value),
    );
    if (selectedOptions.some((o) => !o || o.quantity === 0))
      return fail(`A selected ${a.name.toLowerCase()} option is unavailable.`);
    if (
      selectedOptions.every((o) => o?.quantity !== null) &&
      selectedOptions.reduce((sum, o) => sum + (o?.quantity ?? 0), 0) < quantity
    ) {
      return fail(
        `Selected ${a.name.toLowerCase()} options do not have enough units for quantity ${quantity}.`,
      );
    }
    normalized.push({ attributeId: a.id, values: [...values] });
  }
  return { ok: true, normalized };
}
