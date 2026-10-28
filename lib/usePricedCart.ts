"use client";

import { useEffect, useRef } from "react";
import { cartSignature } from "@/lib/cartMath";
import { notifyError, notifyInfo } from "@/lib/notify";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";

type QuoteBody = {
  error?: string;
  items?: {
    productId: string;
    name: string;
    unitPrice: number;
    image: string | null;
    options?: { id: string; name: string; qty: number; included: number }[];
    spicy: boolean;
    spicyChoice: boolean;
  }[];
  missing?: string[];
  soldOut?: string[];
};

const QUOTE_INTERVAL_MS = 15000;

export function usePricedCart(paused = false) {
  const ready = useCartReady();
  const storeId = useCartStore((state) => state.storeId);
  const priceNonce = useCartStore((state) => state.priceNonce);
  const signature = useCartStore((state) => cartSignature(state.storeId, state.items));
  const generation = useRef(0);

  useEffect(() => {
    if (paused || !ready) return;

    async function quoteNow() {
      const snapshot = useCartStore.getState();
      if (!snapshot.storeId || snapshot.items.length === 0) {
        snapshot.setPriceCheck(cartSignature(snapshot.storeId, snapshot.items));
        return;
      }

      const ticket = generation.current + 1;
      generation.current = ticket;
      const started = cartSignature(snapshot.storeId, snapshot.items);
      try {
        const response = await fetch("/api/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            storeId: snapshot.storeId,
            items: snapshot.items.map((item) => ({
              productId: item.productId,
              qty: item.qty,
              spicy: item.spicy === true,
              ...(item.options && item.options.length > 0
                ? { options: item.options.map((option) => ({ id: option.id, qty: option.qty })) }
                : {}),
            })),
          }),
        });
        const body = (await response.json().catch(() => null)) as QuoteBody | null;
        if (ticket !== generation.current) return;
        const current = cartSignature(
          useCartStore.getState().storeId,
          useCartStore.getState().items,
        );
        if (current !== started) return;
        if (!response.ok || !body?.items) {
          const hadPrice = useCartStore.getState().priceCheck !== null;
          useCartStore.getState().setPriceCheck(null);
          if (hadPrice) notifyError(body?.error || "Impossible de vérifier les prix.");
          return;
        }

        const result = useCartStore.getState().syncQuoted(body.items);
        if (result.removed > 0) {
          notifyError(
            body.soldOut && body.soldOut.length > 0
              ? "Un plat est épuisé. Il a été retiré du panier."
              : "Un plat n’est plus à la carte. Il a été retiré du panier.",
          );
        } else if (result.repriced) {
          notifyInfo("Les prix ont été mis à jour.");
        }
      } catch {
        if (ticket !== generation.current) return;
        const hadPrice = useCartStore.getState().priceCheck !== null;
        useCartStore.getState().setPriceCheck(null);
        if (hadPrice) notifyError("Impossible de vérifier les prix.");
      }
    }

    void quoteNow();
    const timer = window.setInterval(() => {
      void quoteNow();
    }, QUOTE_INTERVAL_MS);
    function onVisible() {
      if (document.visibilityState === "hidden") return;
      void quoteNow();
    }
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      generation.current += 1;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [paused, ready, storeId, signature, priceNonce]);
}
