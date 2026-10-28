"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getStore } from "@/data/stores";
import { countItems } from "@/lib/cartMath";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";

export function Header() {
  const pathname = usePathname();
  const ready = useCartReady();
  const items = useCartStore((state) => state.items);
  const storeId = useCartStore((state) => state.storeId);
  const count = ready ? countItems(items) : 0;
  const store = ready && storeId ? getStore(storeId) : undefined;

  if (pathname.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-white/90 pt-[env(safe-area-inset-top,0px)] text-ink backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <Logo className="h-10 w-10" />
          <span className="text-lg font-bold tracking-[0.18em]">CABANO</span>
        </Link>
        {store ? (
          <p className="hidden min-w-0 flex-1 truncate text-sm font-medium text-ink/50 sm:block">
            {store.name}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <Link
          href="/cart"
          aria-label={
            count > 0 ? `Panier, ${count} ${count > 1 ? "articles" : "article"}` : "Panier"
          }
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-ink text-white"
        >
          <CartIcon />
          {count > 0 ? (
            <span
              key={count}
              className="animate-pop absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-coral px-1 text-xs font-bold"
            >
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6 6h15l-1.5 9h-12L5 3H2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="20" r="1.4" fill="currentColor" />
      <circle cx="18" cy="20" r="1.4" fill="currentColor" />
    </svg>
  );
}
