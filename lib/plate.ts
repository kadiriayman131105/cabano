import { MAX_OPTION_QTY } from "@/lib/limits";

export type PlateOption = {
  id: string;
  name: string;
  included: boolean;
  extraPrice: number;
};

export type PlateChoice = {
  id: string;
  name: string;
  qty: number;
  included: number;
};

export function plateKey(options: { id: string; qty: number }[] | undefined) {
  return [...(options ?? [])]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((option) => `${option.id}:${option.qty}`)
    .join(",");
}

export function optionNote(option: { name: string; qty: number; included: number }) {
  if (option.included > 0 && option.qty <= 0) return `sans ${option.name}`;
  const extra = option.qty - Math.max(0, option.included);
  if (extra > 0) return extra === 1 ? `extra ${option.name}` : `extra ${option.name} × ${extra}`;
  return null;
}

export function pricePlate(
  base: number,
  catalog: PlateOption[],
  chosen: { id: string; qty: number }[] | undefined,
) {
  const picked = new Map((chosen ?? []).map((item) => [item.id, item.qty]));
  let extra = 0;
  const options: PlateChoice[] = [];
  for (const option of catalog) {
    const included = option.included ? 1 : 0;
    const raw = picked.has(option.id) ? (picked.get(option.id) ?? included) : included;
    const qty = Math.min(MAX_OPTION_QTY, Math.max(0, Math.floor(raw)));
    extra += Math.max(0, qty - included) * option.extraPrice;
    if (qty !== included) options.push({ id: option.id, name: option.name, qty, included });
  }
  return { unitPrice: base + extra, extra, options };
}
