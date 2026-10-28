"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { countItems, subtotalOf } from "@/lib/cartMath";
import { formatPrice } from "@/lib/format";
import { usePricedCart } from "@/lib/usePricedCart";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";

export function StickyCartBar() {
  const pathname = usePathname();
  usePricedCart(pathname.startsWith("/admin"));
  const ready = useCartReady();
  const items = useCartStore((state) => state.items);
  const count = ready ? countItems(items) : 0;
  const hidden =
    !ready ||
    count === 0 ||
    pathname === "/cart" ||
    pathname === "/checkout" ||
    pathname.startsWith("/order") ||
    pathname.startsWith("/admin");

  if (hidden) return null;

  const subtotal = subtotalOf(items);
  const label = count > 1 ? "articles" : "article";

  return (
    <>
      <div className="h-24" />
      <div className="fixed inset-x-0 bottom-0 z-40 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:inset-x-auto md:bottom-6 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 md:p-0">
        <Link
          href="/cart"
          className="animate-cart press flex items-center gap-3 rounded-2xl bg-ink px-3 py-3 text-white shadow-[0_12px_40px_rgba(10,20,40,0.28)]"
        >
          <span className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-octopus px-2 text-sm font-bold">
            {count}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-semibold">Voir le panier</span>
            <span className="block text-xs text-white/70">
              {count} {label}
            </span>
          </span>
          <span key={subtotal} className="animate-pop rounded-xl bg-white/10 px-3 py-2 text-sm font-bold">
            {formatPrice(subtotal)}
          </span>
        </Link>
      </div>
    </>
  );
}
