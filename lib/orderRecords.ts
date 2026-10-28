import { randomBytes } from "crypto";
import { findArticle } from "@/lib/catalog";
import { plateKey, pricePlate } from "@/lib/plate";
import { getStore } from "@/data/stores";
import { casablancaToday } from "@/lib/casablanca";
import { getDb } from "@/lib/db";
import { MAX_LINE_COMMENT, MAX_LINE_QTY } from "@/lib/limits";
import type { Customer, Order, OrderItem, OrderStatus } from "@/types";

const STATUSES: OrderStatus[] = [
  "pending",
  "accepted",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

type OrderRow = {
  id: string;
  token: string;
  store_id: string;
  items_json: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  customer_json: string;
  note: string | null;
  payment_method: string;
  status: string;
  created_at: string;
  local_date?: string;
};

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    storeId: row.store_id,
    items: JSON.parse(row.items_json) as OrderItem[],
    subtotal: asNumber(row.subtotal),
    deliveryFee: asNumber(row.delivery_fee),
    total: asNumber(row.total),
    customer: JSON.parse(row.customer_json) as Customer,
    note: row.note ?? undefined,
    paymentMethod: "cash_on_delivery",
    status: row.status as OrderStatus,
    createdAt: row.created_at,
  };
}

function readRow(row: Record<string, unknown> | undefined) {
  if (!row) return null;
  return toOrder(row as unknown as OrderRow);
}

export function isOrderStatus(value: string): value is OrderStatus {
  return STATUSES.includes(value as OrderStatus);
}

export type DatedOrder = Order & { localDate: string };

export function listOrdersBetween(start: string, end: string): DatedOrder[] {
  const rows = getDb()
    .prepare(
      `SELECT id, token, store_id, items_json, subtotal, delivery_fee, total, customer_json, note, payment_method, status, created_at, local_date
       FROM orders
       WHERE local_date >= ? AND local_date <= ?
       ORDER BY created_at DESC`,
    )
    .all(start, end);
  return rows.map((row) => {
    const record = row as unknown as OrderRow;
    return { ...toOrder(record), localDate: String(record.local_date) };
  });
}

export function getOrderByToken(token: string) {
  const row = getDb()
    .prepare(
      `SELECT id, token, store_id, items_json, subtotal, delivery_fee, total, customer_json, note, payment_method, status, created_at
       FROM orders WHERE token = ?`,
    )
    .get(token);
  return readRow(row);
}

export function getOrderById(id: string) {
  const row = getDb()
    .prepare(
      `SELECT id, token, store_id, items_json, subtotal, delivery_fee, total, customer_json, note, payment_method, status, created_at
       FROM orders WHERE id = ?`,
    )
    .get(id);
  return readRow(row);
}

export function updateOrderStatus(id: string, status: OrderStatus) {
  const result = getDb().prepare(`UPDATE orders SET status = ? WHERE id = ?`).run(status, id);
  return result.changes > 0;
}

function nextOrderId(localDate: string) {
  const prefix = `CAB-${localDate.replaceAll("-", "")}-`;
  const row = getDb()
    .prepare(
      `SELECT MAX(CAST(SUBSTR(id, ?) AS INTEGER)) AS maxSeq FROM orders WHERE id LIKE ?`,
    )
    .get(prefix.length + 1, `${prefix}%`);
  const maxSeq = asNumber(row?.maxSeq);
  const next = (Number.isFinite(maxSeq) ? maxSeq : 0) + 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
}

export type QuotedItem = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  image: string | null;
  comment?: string;
  options?: { id: string; name: string; qty: number; included: number }[];
  spicy: boolean;
  spicyChoice: boolean;
};

export type CartQuote = {
  items: QuotedItem[];
  missing: string[];
  soldOut: string[];
  subtotal: number;
  deliveryFee: number;
  total: number;
};

function plateComment(value: string | undefined) {
  const text = value?.trim().slice(0, MAX_LINE_COMMENT);
  return text || undefined;
}

function mergeQty(
  lines: { productId: string; qty: number; spicy?: boolean; comment?: string; options?: { id: string; qty: number }[] }[],
):
  | { ok: false; error: string }
  | { ok: true; merged: { productId: string; qty: number; spicy: boolean; comment?: string; options?: { id: string; qty: number }[] }[] } {
  const merged = new Map<
    string,
    { productId: string; qty: number; spicy: boolean; comment?: string; options?: { id: string; qty: number }[] }
  >();
  for (const line of lines) {
    if (!line.productId || !Number.isInteger(line.qty) || line.qty < 1) {
      return { ok: false, error: "Quantité invalide." };
    }
    const spicy = line.spicy === true;
    const key = `${line.productId}:${spicy ? "1" : "0"}:${plateKey(line.options)}`;
    const prev = merged.get(key);
    const next = (prev?.qty ?? 0) + line.qty;
    if (next > MAX_LINE_QTY) return { ok: false, error: "Quantité trop élevée pour un plat." };
    merged.set(key, {
      productId: line.productId,
      qty: next,
      spicy,
      comment: plateComment(line.comment) ?? prev?.comment,
      options: line.options,
    });
  }
  if (merged.size === 0) return { ok: false, error: "Le panier est vide." };
  return { ok: true, merged: [...merged.values()] };
}

export function quoteCart(
  storeId: string,
  lines: { productId: string; qty: number; spicy?: boolean; comment?: string; options?: { id: string; qty: number }[] }[],
): { error: string } | CartQuote {
  const store = getStore(storeId);
  if (!store) return { error: "Magasin inconnu." };
  const merged = mergeQty(lines);
  if (!merged.ok) return { error: merged.error };

  const folded = new Map<
    string,
    { productId: string; qty: number; spicy: boolean; comment?: string; options?: { id: string; qty: number }[] }
  >();
  for (const line of merged.merged) {
    const found = findArticle(line.productId);
    const choice = Boolean(found && found.product.storeIds.includes(store.id) && found.product.spicyChoice);
    const spicy = choice && line.spicy;
    const key = `${line.productId}:${spicy ? "1" : "0"}:${plateKey(line.options)}`;
    const prev = folded.get(key);
    const next = (prev?.qty ?? 0) + line.qty;
    if (next > MAX_LINE_QTY) return { error: "Quantité trop élevée pour un plat." };
    folded.set(key, {
      productId: line.productId,
      qty: next,
      spicy,
      comment: line.comment ?? prev?.comment,
      options: line.options,
    });
  }

  const missing: string[] = [];
  const soldOut: string[] = [];
  const items: QuotedItem[] = [];
  for (const line of folded.values()) {
    const found = findArticle(line.productId);
    if (!found || !found.product.storeIds.includes(store.id)) {
      missing.push(line.productId);
      continue;
    }
    if (!found.available) {
      soldOut.push(line.productId);
      continue;
    }
    const product = found.product;
    const spicyChoice = product.spicyChoice === true;
    const priced = pricePlate(product.price, product.options ?? [], line.options);
    items.push({
      productId: product.id,
      name: product.name,
      unitPrice: priced.unitPrice,
      qty: line.qty,
      lineTotal: priced.unitPrice * line.qty,
      image: product.image,
      ...(line.comment ? { comment: line.comment } : {}),
      ...(priced.options.length > 0 ? { options: priced.options } : {}),
      spicy: spicyChoice && line.spicy,
      spicyChoice,
    });
  }

  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const deliveryFee = items.length > 0 ? store.deliveryFee : 0;
  return { items, missing, soldOut, subtotal, deliveryFee, total: subtotal + deliveryFee };
}

export function createOrder(input: {
  storeId: string;
  lines: { productId: string; qty: number; spicy?: boolean; comment?: string; options?: { id: string; qty: number }[] }[];
  customer: Customer;
  note?: string;
  expectedTotal?: number;
}) {
  const store = getStore(input.storeId);
  if (!store) return { error: "Magasin inconnu." as const };

  const quoted = quoteCart(input.storeId, input.lines);
  if ("error" in quoted) return quoted;
  if (quoted.soldOut.length > 0) {
    return { error: "Un plat est épuisé." as const, quote: quoted };
  }
  if (quoted.missing.length > 0 || quoted.items.length === 0) {
    return { error: "Un plat de cette commande n'est pas disponible." as const };
  }
  if (input.expectedTotal !== undefined && input.expectedTotal !== quoted.total) {
    return {
      error: "Le total a changé. Vérifiez le montant avant de valider." as const,
      conflict: true as const,
      quote: quoted,
    };
  }

  const items: OrderItem[] = quoted.items.map((item) => ({
    productId: item.productId,
    name: item.name,
    unitPrice: item.unitPrice,
    qty: item.qty,
    lineTotal: item.lineTotal,
    ...(item.comment ? { comment: item.comment } : {}),
    ...(item.options && item.options.length > 0 ? { options: item.options } : {}),
    ...(item.spicyChoice ? { spicy: item.spicy } : {}),
  }));
  const subtotal = quoted.subtotal;
  const deliveryFee = quoted.deliveryFee;
  const total = quoted.total;
  const now = new Date();
  const localDate = casablancaToday(now);
  const token = randomBytes(24).toString("base64url");
  const note = input.note?.trim() ? input.note.trim() : null;
  const db = getDb();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      db.exec("BEGIN IMMEDIATE");
      const id = nextOrderId(localDate);
      db.prepare(
        `INSERT INTO orders (
          id, token, store_id, items_json, subtotal, delivery_fee, total,
          customer_json, note, payment_method, status, created_at, local_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'cash_on_delivery', 'pending', ?, ?)`,
      ).run(
        id,
        token,
        store.id,
        JSON.stringify(items),
        subtotal,
        deliveryFee,
        total,
        JSON.stringify(input.customer),
        note,
        now.toISOString(),
        localDate,
      );
      db.exec("COMMIT");
      return {
        order: {
          id,
          storeId: store.id,
          items,
          subtotal,
          deliveryFee,
          total,
          customer: input.customer,
          note: note ?? undefined,
          paymentMethod: "cash_on_delivery" as const,
          status: "pending" as const,
          createdAt: now.toISOString(),
        },
        token,
      };
    } catch (error) {
      try {
        db.exec("ROLLBACK");
      } catch {
        // The transaction was already closed.
      }
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("UNIQUE") || attempt === 2) throw error;
    }
  }

  throw new Error("Impossible de créer la commande.");
}
