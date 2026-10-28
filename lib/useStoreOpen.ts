"use client";

import { useSyncExternalStore } from "react";
import { isOpenNow } from "@/lib/hours";

function subscribe(onChange: () => void) {
  const id = window.setInterval(onChange, 60_000);
  return () => window.clearInterval(id);
}

export function useStoreOpen() {
  return useSyncExternalStore(subscribe, () => isOpenNow(), () => null as boolean | null);
}
