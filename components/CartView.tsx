"use client";

import Link from "next/link";
import { CartItemRow } from "@/components/CartItemRow";
import { CartSummary } from "@/components/CartSummary";
import { confirmAction } from "@/components/ConfirmDialog";
import { getStore } from "@/data/stores";
import { countItems, subtotalOf } from "@/lib/cartMath";
import { formatPrice } from "@/lib/format";
import { plateKey } from "@/lib/plate";
import { notifySaved } from "@/lib/notify";
import { CLOSED_MESSAGE } from "@/lib/hours";
import { useStoreOpen } from "@/lib/useStoreOpen";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";

export function CartView() {
  const ready = useCartReady();
  const items = useCartStore((state) => state.items);
  const storeId = useCartStore((state) => state.storeId);
  const setQty = useCartStore((state) => state.setQty);
  const setComment = useCartStore((state) => state.setComment);
  const open = useStoreOpen();
  const closed = open === false;
  const store = storeId ? getStore(storeId) : undefined;

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="h-48 animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }

  if (items.length === 0 || !store) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-ink">Votre panier est vide</h1>
        <p className="mt-2 text-ink/70">Choisissez un magasin pour commencer.</p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-octopus px-5 font-semibold text-white"
        >
          Voir les magasins
        </Link>
      </main>
    );
  }

  const subtotal = subtotalOf(items);
  const total = subtotal + store.deliveryFee;
  const count = countItems(items);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 lg:pb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-octopus">Panier</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">{store.name}</h1>
      <p className="mt-1 text-sm text-ink/60">
        {count} {count > 1 ? "articles" : "article"}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="rounded-[28px] bg-white px-4 shadow-[0_8px_30px_rgba(10,20,40,0.05)]">
          {items.map((item) => (
            <CartItemRow
              key={`${item.productId}-${item.spicy === true ? "1" : "0"}-${plateKey(item.options)}`}
              item={item}
              onQty={async (qty) => {
                if (qty <= 0) {
                  const ok = await confirmAction({
                    title: "Retirer du panier ?",
                    message: item.spicy ? `${item.name} · Épicé` : item.name,
                    confirmLabel: "Retirer",
                    danger: true,
                  });
                  if (!ok) return;
                  notifySaved("Retiré du panier.");
                }
                setQty(item.productId, qty, item.spicy === true, plateKey(item.options));
              }}
              onComment={(comment) => setComment(item.productId, comment, item.spicy === true, plateKey(item.options))}
            />
          ))}
        </ul>
        <div className="h-fit space-y-4 lg:sticky lg:top-24">
          <CartSummary subtotal={subtotal} deliveryFee={store.deliveryFee} total={total} />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
            {closed ? (
              <p className="rounded-2xl bg-sea px-4 py-3 text-center text-sm font-semibold text-ink">
                {CLOSED_MESSAGE}
              </p>
            ) : (
              <Link
                href="/checkout"
                className="press flex h-12 items-center justify-between rounded-2xl bg-ink px-5 font-semibold text-white"
              >
                <span>Commander</span>
                <span>{formatPrice(total)}</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
