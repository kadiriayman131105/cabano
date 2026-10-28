"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { assignQuoted, cartSignature } from "@/lib/cartMath";
import { MAX_DISTINCT_LINES, MAX_LINE_COMMENT, MAX_LINE_QTY } from "@/lib/limits";
import { plateKey, pricePlate, type PlateChoice } from "@/lib/plate";
import type { CartItem, Product } from "@/types";

export const CART_KEY = "cabano-cart";

export type AddResult = "added" | "store-mismatch" | "too-many";

type QuotedLine = {
  productId: string;
  name: string;
  unitPrice: number;
  image: string | null;
  options?: PlateChoice[];
  spicy: boolean;
  spicyChoice: boolean;
};

type OrderLine = {
  productId: string;
  name: string;
  unitPrice: number;
  qty: number;
  image?: string | null;
  comment?: string;
  options?: PlateChoice[];
  spicy?: boolean;
  spicyChoice?: boolean;
};

type CartState = {
  storeId: string | null;
  items: CartItem[];
  priceCheck: string | null;
  priceNonce: number;
  addItem: (storeId: string, product: Product, qty: number, choices?: PlateChoice[]) => AddResult;
  setQty: (productId: string, qty: number, spicy?: boolean, key?: string) => void;
  setComment: (productId: string, comment: string, spicy?: boolean, key?: string) => void;
  setSpicy: (productId: string, spicy: boolean, next: boolean) => "ok" | "too-many";
  replaceOrder: (storeId: string, lines: OrderLine[]) => void;
  clear: () => void;
  syncQuoted: (quoted: QuotedLine[]) => { removed: number; repriced: boolean };
  setPriceCheck: (value: string | null) => void;
  recheckPrices: () => void;
};

function foldPlates(items: CartItem[]) {
  const folded: CartItem[] = [];
  for (const item of items) {
    const key = plateKey(item.options);
    const existing = folded.find((other) => samePlate(other, item.productId, item.spicy === true, key));
    if (!existing) {
      folded.push({ ...item });
      continue;
    }
    existing.qty = Math.min(MAX_LINE_QTY, existing.qty + item.qty);
    if (!existing.comment && item.comment) existing.comment = item.comment;
  }
  return folded;
}

function samePlate(item: CartItem, productId: string, spicy: boolean, key = "") {
  return item.productId === productId && (item.spicy === true) === spicy && plateKey(item.options) === key;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      storeId: null,
      items: [],
      priceCheck: null,
      priceNonce: 0,
      addItem: (storeId, product, qty, choices) => {
        const state = get();
        if (state.storeId && state.storeId !== storeId && state.items.length > 0) {
          return "store-mismatch";
        }

        const choice = product.spicyChoice !== false;
        const priced = pricePlate(product.price, product.options ?? [], choices);
        const key = plateKey(priced.options);
        const requested = Math.max(1, Math.floor(qty) || 1);
        const existing = state.items.find((item) => samePlate(item, product.id, false, key));
        if (!existing && state.items.length >= MAX_DISTINCT_LINES) return "too-many";
        const current = existing?.qty ?? 0;
        const nextQty = Math.min(MAX_LINE_QTY, current + requested);
        if (nextQty === current) return "added";
        const nextItem: CartItem = {
          productId: product.id,
          name: product.name,
          unitPrice: priced.unitPrice,
          qty: nextQty,
          image: product.image,
          ...(existing?.comment ? { comment: existing.comment } : {}),
          ...(priced.options.length > 0 ? { options: priced.options } : {}),
          spicy: false,
          spicyChoice: choice,
        };

        set({
          storeId,
          items: existing
            ? state.items.map((item) => (samePlate(item, product.id, false, key) ? nextItem : item))
            : [...state.items, nextItem],
        });

        return "added";
      },
      setQty: (productId, qty, spicy = false, key = "") => {
        const state = get();
        if (!state.items.some((item) => samePlate(item, productId, spicy, key))) return;

        const nextQty = Math.floor(qty);
        const capped = nextQty > MAX_LINE_QTY ? MAX_LINE_QTY : nextQty;
        const items =
          nextQty <= 0
            ? state.items.filter((item) => !samePlate(item, productId, spicy, key))
            : state.items.map((item) =>
                samePlate(item, productId, spicy, key) ? { ...item, qty: capped } : item,
              );

        set({
          items,
          storeId: items.length > 0 ? state.storeId : null,
        });
      },
      setComment: (productId, comment, spicy = false, key = "") => {
        const state = get();
        if (!state.items.some((item) => samePlate(item, productId, spicy, key))) return;
        const text = comment.slice(0, MAX_LINE_COMMENT);
        const next = text.trim() ? text : undefined;
        set({
          items: state.items.map((item) => {
            if (!samePlate(item, productId, spicy, key)) return item;
            if (!next) {
              const rest = { ...item };
              delete rest.comment;
              return rest;
            }
            return { ...item, comment: next };
          }),
        });
      },
      setSpicy: (productId, spicy, next) => {
        if (spicy === next) return "ok";
        const state = get();
        const current = state.items.find((item) => samePlate(item, productId, spicy));
        if (!current || current.spicyChoice === false) return "ok";
        const target = state.items.find((item) => samePlate(item, productId, next));
        if (!target) {
          set({
            items: state.items.map((item) =>
              samePlate(item, productId, spicy) ? { ...item, spicy: next } : item,
            ),
          });
          return "ok";
        }
        if (current.qty + target.qty > MAX_LINE_QTY) return "too-many";
        set({
          items: state.items.flatMap((item) => {
            if (samePlate(item, productId, spicy)) return [];
            if (samePlate(item, productId, next)) return [{ ...item, qty: current.qty + target.qty }];
            return [item];
          }),
        });
        return "ok";
      },
      replaceOrder: (storeId, lines) => {
        const items: CartItem[] = [];
        for (const line of lines) {
          const choice = line.spicyChoice !== false;
          const plate = choice && line.spicy === true;
          const qty = Math.min(MAX_LINE_QTY, Math.floor(line.qty));
          if (!line.productId || qty < 1) continue;
          const key = plateKey(line.options);
          const existing = items.find((item) => samePlate(item, line.productId, plate, key));
          if (existing) {
            existing.qty = Math.min(MAX_LINE_QTY, existing.qty + qty);
            continue;
          }
          if (items.length >= MAX_DISTINCT_LINES) continue;
          const comment = line.comment?.trim().slice(0, MAX_LINE_COMMENT);
          items.push({
            productId: line.productId,
            name: line.name,
            unitPrice: line.unitPrice,
            qty,
            image: line.image,
            ...(comment ? { comment } : {}),
            ...(line.options && line.options.length > 0 ? { options: line.options } : {}),
            spicy: plate,
            spicyChoice: choice,
          });
        }
        set((state) => ({
          storeId: items.length > 0 ? storeId : null,
          items,
          priceCheck: null,
          priceNonce: state.priceNonce + 1,
        }));
      },
      clear: () => set({ items: [], storeId: null, priceCheck: null }),
      syncQuoted: (quoted) => {
        const state = get();
        const assigned = assignQuoted(state.items, quoted);
        let removed = 0;
        let repriced = false;
        let changed = false;
        const updated = state.items.flatMap((item, index) => {
          const next = assigned[index];
          if (!next) {
            removed += 1;
            changed = true;
            return [];
          }
          const plate = item.spicy === true;
          const image = next.image;
          const spicy = next.spicyChoice && plate;
          const options = next.options && next.options.length > 0 ? next.options : undefined;
          if (item.unitPrice !== next.unitPrice) repriced = true;
          if (
            item.name !== next.name ||
            item.unitPrice !== next.unitPrice ||
            (item.image ?? null) !== image ||
            (item.spicy === true) !== spicy ||
            (item.spicyChoice !== false) !== next.spicyChoice ||
            plateKey(item.options) !== plateKey(options) ||
            JSON.stringify(item.options ?? []) !== JSON.stringify(options ?? [])
          ) {
            changed = true;
            const line: CartItem = {
              ...item,
              name: next.name,
              unitPrice: next.unitPrice,
              image,
              spicy,
              spicyChoice: next.spicyChoice,
            };
            if (options) line.options = options;
            else delete line.options;
            return [line];
          }
          return [item];
        });
        const items = foldPlates(updated);
        if (items.length !== updated.length) changed = true;
        const storeId = items.length > 0 ? state.storeId : null;
        const priceCheck = cartSignature(storeId, items);
        if (!changed && state.priceCheck === priceCheck) {
          return { removed, repriced };
        }
        set({ items, storeId, priceCheck });
        return { removed, repriced };
      },
      setPriceCheck: (value) => set({ priceCheck: value }),
      recheckPrices: () =>
        set((state) => ({ priceCheck: null, priceNonce: state.priceNonce + 1 })),
    }),
    {
      name: CART_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ storeId: state.storeId, items: state.items }),
    },
  ),
);
