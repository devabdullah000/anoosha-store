"use client";

import type { ChangeEvent } from "react";
import type { AttributeDefinition, ProductAttributeValue } from "./product-types";
import type { EditorVariant, EditorImage } from "./product-editor-model";
import ProductImagePreview from "./product-image-preview";

const input = "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500";
const smallButton = "rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50";
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

type Props = {
  variant: EditorVariant;
  index: number;
  total: number;
  stockEditable: boolean;
  definitions: AttributeDefinition[];
  onChange: (patch: Partial<EditorVariant>) => void;
  onRemove: () => void;
  onMakeDefault: () => void;
  onPreviewUrl: (file: File) => string;
  onError: (message: string) => void;
};

export default function ProductVariantCard({
  variant: v, index, total, stockEditable, definitions, onChange, onRemove,
  onMakeDefault, onPreviewUrl, onError,
}: Props) {
  const updateAttribute = (attributeId: string, next: ProductAttributeValue) => {
    onChange({ attributes: v.attributes.map((item) => item.attributeId === attributeId ? next : item) });
  };
  const addImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (v.images.length + files.length > 5) return onError("Each variant can have at most five images.");
    if (files.some((file) => !ALLOWED.has(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024)) {
      return onError("Use JPEG, PNG, WebP or AVIF images, maximum 5 MB per file.");
    }
    const entries: EditorImage[] = files.map((file) => ({
      clientId: crypto.randomUUID(),
      uploadId: crypto.randomUUID(),
      file, url: onPreviewUrl(file), isPrimary: false,
    }));
    const images = [...v.images, ...entries];
    if (!images.some((image) => image.isPrimary)) images[0] = { ...images[0], isPrimary: true };
    onChange({ images });
  };
  const removeImage = (clientId: string) => {
    const images = v.images.filter((image) => image.clientId !== clientId);
    if (images.length && !images.some((image) => image.isPrimary)) {
      images[0] = { ...images[0], isPrimary: true };
    }
    onChange({ images });
  };
  const addAttribute = (attributeId: string) => {
    const definition = definitions.find((item) => item.id === attributeId);
    if (!definition || v.attributes.some((item) => item.attributeId === attributeId)) return;
    const assignment: ProductAttributeValue = definition.displayType === "dropdown"
      ? { attributeId, kind: "dropdown", options: [{ label: "", quantity: 0 }, { label: "", quantity: 0 }] }
      : { attributeId, kind: definition.displayType, values: [definition.displayType === "color" ? "#000000" : ""] };
    onChange({ attributes: [...v.attributes, assignment] });
  };
  const renderAttribute = (attribute: ProductAttributeValue) => {
    const definition = definitions.find((item) => item.id === attribute.attributeId);
    const allocatedQuantity = attribute.kind === "dropdown"
      ? attribute.options.reduce((sum, option) => sum + option.quantity, 0)
      : 0;
    const excessQuantity = Math.max(0, allocatedQuantity - v.stock);
    return (
      <div key={attribute.attributeId} className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-slate-800">{definition?.name ?? "Unknown attribute"}</span>
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
              {attribute.kind}
            </span>
            {definition && definition.displayType !== attribute.kind && (
              <span className="rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-700">
                Catalog type changed to {definition.displayType}. Remove and re-add this assignment.
              </span>
            )}
          </div>
          <button type="button" className="text-xs font-bold text-rose-600 hover:underline"
            onClick={() => onChange({ attributes: v.attributes.filter((item) => item.attributeId !== attribute.attributeId) })}>
            Remove attribute
          </button>
        </div>
        {attribute.kind === "dropdown" ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-500">Add at least two options. Assign an optional stock allocation to each (the total cannot exceed variant stock).</p>
            <div className="space-y-2">
              <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2">
                <span className={label}>Attribute value</span>
                <span className={label}>Quantity</span>
                <span aria-hidden="true" />
              </div>
              {attribute.options.map((option, optionIndex) => (
                <div key={optionIndex} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_2.25rem] items-center gap-2">
                  <input aria-label={`Option ${optionIndex + 1}`} placeholder={`Option ${optionIndex + 1} (e.g. Small)`}
                    value={option.label} maxLength={100} className={`${input} min-w-0`}
                    onChange={(event) => updateAttribute(attribute.attributeId, {
                      ...attribute, options: attribute.options.map((o, i) => i === optionIndex ? { ...o, label: event.target.value } : o),
                    })} />
                  <input aria-label={`Allocated quantity for option ${optionIndex + 1}`} type="number" min={0} step={1}
                    value={option.quantity} className={`${input} min-w-0`}
                    onChange={(event) => updateAttribute(attribute.attributeId, {
                      ...attribute, options: attribute.options.map((o, i) => i === optionIndex ? { ...o, quantity: Math.max(0, Number(event.target.value) || 0) } : o),
                    })} />
                  <button type="button" aria-label="Remove option" title="Remove option"
                    className="grid h-9 w-9 place-items-center rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                    onClick={() => updateAttribute(attribute.attributeId, { ...attribute, options: attribute.options.filter((_, i) => i !== optionIndex) })}>×</button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button type="button" className={smallButton} disabled={attribute.options.length >= 50}
                onClick={() => updateAttribute(attribute.attributeId, { ...attribute, options: [...attribute.options, { label: "", quantity: 0 }] })}>+ Add option</button>
              <span className={`text-xs font-semibold ${excessQuantity > 0 ? "text-rose-600" : "text-slate-500"}`}>Allocated: {allocatedQuantity} / {v.stock}</span>
            </div>
            {excessQuantity > 0 && (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs leading-5 text-rose-700">
                The <strong>{definition?.name ?? "dropdown"}</strong> options allocate <strong>{allocatedQuantity}</strong> units,
                but this variant has only <strong>{v.stock}</strong> in stock. Reduce the quantities by {excessQuantity}
                or increase the variant stock to at least {allocatedQuantity}.
              </div>
            )}
            {attribute.options.some((option) => option.label.trim()) && (
              <>
                <div className="flex flex-wrap gap-1.5">
                  {attribute.options.filter((o) => o.label.trim()).map((o, i) => (
                    <span key={i} className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs text-indigo-700">{o.label} · {o.quantity}</span>
                  ))}
                </div>
                <label className={label}>Storefront multiple-selection preview</label>
                <select multiple size={Math.min(4, Math.max(2, attribute.options.length))}
                  aria-label={`${definition?.name ?? "Attribute"} multiple selection preview`}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {attribute.options.filter((o) => o.label.trim()).map((option, i) => (
                    <option key={i} value={option.label}>{option.label} — qty {option.quantity}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400">Preview selections are not persisted; all configured options are saved.</p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {attribute.values.map((value, valueIndex) => (
                <div key={valueIndex} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5">
                  {attribute.kind === "color" && <span className="h-6 w-6 rounded-md border border-slate-300" style={{ backgroundColor: /^#[\da-fA-F]{6}$/.test(value) ? value : "#ffffff" }} />}
                  {attribute.kind === "color" && (
                    <input type="color" value={/^#[\da-fA-F]{6}$/.test(value) ? value : "#000000"}
                      aria-label="Choose color" className="h-7 w-8 cursor-pointer"
                      onChange={(event) => updateAttribute(attribute.attributeId, { ...attribute, values: attribute.values.map((o, i) => i === valueIndex ? event.target.value : o) })} />
                  )}
                  <input type="text" value={value} maxLength={100} placeholder={attribute.kind === "color" ? "#000000" : "Value"}
                    aria-label="Attribute value" className="w-28 bg-transparent text-xs font-semibold text-slate-800 outline-none"
                    onChange={(event) => updateAttribute(attribute.attributeId, { ...attribute, values: attribute.values.map((o, i) => i === valueIndex ? event.target.value : o) })} />
                  <button type="button" aria-label="Remove value" className="px-1 text-base font-bold text-rose-600"
                    onClick={() => updateAttribute(attribute.attributeId, { ...attribute, values: attribute.values.filter((_, i) => i !== valueIndex) })}>×</button>
                </div>
              ))}
            </div>
            <button type="button" className={smallButton} disabled={attribute.values.length >= 50}
              onClick={() => updateAttribute(attribute.attributeId, { ...attribute, values: [...attribute.values, attribute.kind === "color" ? "#000000" : ""] })}>+ Add value</button>
            <p className="text-xs text-slate-400">Rectangular tags are display values; they are not product variant selectors in this editor.</p>
          </div>
        )}
      </div>
    );
  };
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-5">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-pink-500 to-indigo-600 text-xs font-bold text-white">{index + 1}</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900">{total > 1 ? `Variant ${index + 1}` : "Simple product details"}</h3>
            <p className="text-xs text-slate-500">{v.id ? "Existing variant" : "New variant"} · {v.isDefault ? "Default" : "Additional"}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!v.isDefault && <button type="button" className={smallButton} onClick={onMakeDefault}>Make default</button>}
          {total > 1 && <button type="button" className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-100" onClick={onRemove}>Remove ×</button>}
        </div>
      </div>
      <div className="space-y-5 p-4 sm:p-5">
        <div className="grid gap-4 md:grid-cols-2">
          {total > 1 && (
            <div><label className={label}>Variant name *</label><input className={input} maxLength={120} value={v.name} placeholder="e.g. Black / Large"
              onChange={(e) => onChange({ name: e.target.value })} /></div>
          )}
          <div><label className={label}>SKU *</label><input className={input} maxLength={80} value={v.sku} placeholder="e.g. MOUSE-BLK-001"
            onChange={(e) => onChange({ sku: e.target.value })} /></div>
          <div><label className={label}>Sale price (PKR) *</label><input className={input} type="text" inputMode="decimal" value={v.salePriceText} placeholder="2499.00"
            onChange={(e) => onChange({ salePriceText: e.target.value })} /></div>
          <div><label className={label}>Purchase price (PKR) *</label><input className={input} type="text" inputMode="decimal" value={v.purchasePriceText} placeholder="1800.00"
            onChange={(e) => onChange({ purchasePriceText: e.target.value })} /></div>
          <div>
            <label className={label}>{stockEditable ? "Initial stock *" : "Current stock (Inventory only)"}</label>
            <input
              className={`${input} ${stockEditable ? "" : "cursor-not-allowed border-slate-200 bg-slate-100 font-semibold text-slate-800 opacity-100"}`}
              type="number" min={0} step={1} value={v.stock}
              disabled={!stockEditable}
              aria-label={stockEditable ? "Initial stock" : "Current stock. Edit through Inventory"}
              onChange={(e) => {
                if (stockEditable) onChange({ stock: Math.max(0, Number(e.target.value) || 0) });
              }}
            />
            {!stockEditable && <p className="mt-1.5 text-xs text-slate-500">Stock changes are made through the Inventory module.</p>}
          </div>
          <div><label className={label}>Tag (optional)</label><input className={input} maxLength={80} value={v.tag} placeholder="Featured / Sale"
            onChange={(e) => onChange({ tag: e.target.value })} /></div>
        </div>
        <div><label className={label}>Description *</label><textarea rows={3} maxLength={4000} value={v.description} placeholder="Explain this variant..."
          onChange={(e) => onChange({ description: e.target.value })}
          className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10" /></div>
        <div><label className={label}>Short description (optional)</label><input className={input} maxLength={500} value={v.shortDescription} placeholder="Short storefront summary"
          onChange={(e) => onChange({ shortDescription: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={v.status} onChange={(e) => onChange({ status: e.target.checked })} className="h-4 w-4 accent-indigo-600" /> Variant active
          </label>
          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
            <input type="checkbox" checked={v.hasDiscount} onChange={(e) => onChange({ hasDiscount: e.target.checked, discountPercentage: e.target.checked ? 1 : 0 })} className="h-4 w-4 accent-indigo-600" /> Discount enabled
          </label>
        </div>
        {v.hasDiscount && <div className="max-w-xs"><label className={label}>Discount percentage (1–99)</label>
          <input className={input} type="number" min={1} max={99} step={1} value={v.discountPercentage}
            onChange={(e) => onChange({ discountPercentage: Number(e.target.value) })} /></div>}
        <div className="border-t border-slate-200 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div><h4 className="text-sm font-bold text-slate-900">Product images</h4>
              <p className="mt-0.5 text-xs text-slate-500">Up to 5 per variant · JPG, PNG, WebP, AVIF · 5 MB each</p></div>
            <label className="cursor-pointer rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100">
              + Add images<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple className="sr-only" onChange={addImages} />
            </label>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {v.images.map((image) => (
              <div key={image.clientId} className="relative h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <ProductImagePreview
                  src={image.url}
                  alt={`Product variant image ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
                <button type="button" aria-label="Remove image" title="Remove image"
                  onClick={() => removeImage(image.clientId)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-rose-600 text-sm font-bold text-white shadow">×</button>
                <button type="button" onClick={() => onChange({ images: v.images.map((im) => ({ ...im, isPrimary: im.clientId === image.clientId })) })}
                  className={`absolute bottom-1 left-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold shadow ${image.isPrimary ? "bg-indigo-600 text-white" : "bg-white/95 text-slate-700"}`}>
                  {image.isPrimary ? "Primary ✓" : "Make primary"}
                </button>
              </div>
            ))}
            {!v.images.length && <div className="flex h-28 min-w-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-5 text-xs text-slate-400">No images added yet</div>}
          </div>
        </div>
        <div className="border-t border-slate-200 pt-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div><h4 className="text-sm font-bold text-slate-900">Variant attributes</h4>
              <p className="mt-1 text-xs text-slate-500">Attribute definitions and display types come from the Attributes module.</p></div>
            <select aria-label="Add attribute" value="" className={`${input} max-w-52`} onChange={(e) => addAttribute(e.target.value)}>
              <option value="">+ Add attribute</option>
              {definitions.filter((d) => !v.attributes.some((a) => a.attributeId === d.id)).map((d) => <option key={d.id} value={d.id}>{d.name} · {d.displayType}</option>)}
            </select>
          </div>
          <div className="space-y-3">
            {v.attributes.map(renderAttribute)}
            {!v.attributes.length && <p className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-center text-xs text-slate-400">No attributes assigned to this variant.</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
