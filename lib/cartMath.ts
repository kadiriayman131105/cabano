import { plateKey } from "@/lib/plate";
import type { CartItem } from "@/types";

export function countItems(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.qty, 0);
}

export function subtotalOf(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

type QuotedPlate = {
  productId: string;
  spicy?: boolean;
  options?: { id: string; qty: number }[];
};

function plateIdentity(line: QuotedPlate) {
  return `${line.productId}:${line.spicy === true ? "1" : "0"}:${plateKey(line.options)}`;
}

export function assignQuoted<T extends QuotedPlate>(lines: QuotedPlate[], quoted: T[]): (T | undefined)[] {
  const pool = quoted.map((item) => ({ item, used: false }));
  const assigned: (T | undefined)[] = lines.map(() => undefined);

  lines.forEach((line, index) => {
    const key = plateIdentity(line);
    const found = pool.find((entry) => !entry.used && plateIdentity(entry.item) === key);
    if (!found) return;
    found.used = true;
    assigned[index] = found.item;
  });

  lines.forEach((line, index) => {
    if (assigned[index]) return;
    const found = pool.find(
      (entry) =>
        !entry.used && entry.item.productId === line.productId && (entry.item.spicy === true) === (line.spicy === true),
    );
    if (!found) return;
    found.used = true;
    assigned[index] = found.item;
  });

  return assigned;
}

export function cartSignature(
  storeId: string | null,
  items: { productId: string; qty: number; unitPrice?: number; spicy?: boolean; options?: { id: string; qty: number }[] }[],
) {
  return `${storeId ?? ""}:${items
    .map(
      (item) =>
        `${item.productId}:${item.spicy === true ? 1 : 0}:${plateKey(item.options)}:${item.qty}:${item.unitPrice ?? ""}`,
    )
    .join("|")}`;
}
