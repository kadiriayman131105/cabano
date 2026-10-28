"use client";

import { useSyncExternalStore } from "react";
import { useCartStore } from "@/store/cartStore";

function subscribe(onChange: () => void) {
  const unsubscribe = useCartStore.persist.onFinishHydration(onChange);
  const timeout = window.setTimeout(() => {
    if (useCartStore.persist.hasHydrated()) onChange();
  }, 0);
  return () => {
    window.clearTimeout(timeout);
    unsubscribe();
  };
}

export function useCartReady() {
  return useSyncExternalStore(
    subscribe,
    () => useCartStore.persist.hasHydrated(),
    () => false,
  );
}
