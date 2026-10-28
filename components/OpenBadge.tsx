"use client";

import { useStoreOpen } from "@/lib/useStoreOpen";

export function OpenBadge() {
  const open = useStoreOpen();

  if (open === null) {
    return <span className="inline-block h-6 w-16 rounded-full bg-white/70" />;
  }

  return open ? (
    <span className="shrink-0 rounded-full bg-success px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
      Ouvert
    </span>
  ) : (
    <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-ink shadow-sm ring-1 ring-ink/10">
      Fermé
    </span>
  );
}
