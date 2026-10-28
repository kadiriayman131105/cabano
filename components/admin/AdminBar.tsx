"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { confirmAction } from "@/components/ConfirmDialog";
import { Logo } from "@/components/Logo";
import { notifyError } from "@/lib/notify";

function DoorIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        d="M7 4.5h8.5A1.5 1.5 0 0 1 17 6v13.5H7V4.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path d="M5 19.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <circle cx="14.2" cy="12" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function AdminBar() {
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const ordersActive = pathname === "/admin" || pathname.startsWith("/admin/orders");
  const carteActive = pathname.startsWith("/admin/carte");

  async function logout() {
    const ok = await confirmAction({
      title: "Se déconnecter ?",
      message: "La session de gestion sera fermée.",
      confirmLabel: "Se déconnecter",
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/logout", { method: "POST", cache: "no-store" });
      if (!response.ok) {
        notifyError("Impossible de se déconnecter.");
        setBusy(false);
        return;
      }
      window.location.replace("/admin/login");
    } catch {
      notifyError("Impossible de se déconnecter.");
      setBusy(false);
    }
  }

  const linkClass = (active: boolean) =>
    `flex h-11 flex-1 items-center justify-center rounded-full px-3 text-sm font-semibold sm:flex-none ${
      active ? "bg-white text-ink" : "text-white/80"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-ink pt-[env(safe-area-inset-top,0px)] text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2 sm:h-16 sm:flex-row sm:items-center sm:gap-3 sm:px-4 sm:py-0">
        <div className="flex items-center gap-2">
          <Link href="/admin" className="flex min-w-0 items-center gap-2">
            <Logo className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
            <span className="hidden truncate text-base font-bold tracking-[0.14em] min-[340px]:inline sm:text-lg">
              CABANO
            </span>
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="ml-auto flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-2.5 text-xs font-semibold disabled:opacity-60 min-[340px]:px-3 min-[340px]:text-sm sm:hidden"
          >
            <DoorIcon />
            Se déconnecter
          </button>
        </div>
        <nav className="flex items-center gap-1 sm:ml-auto">
          <Link href="/admin" className={linkClass(ordersActive)}>
            Commandes
          </Link>
          <Link href="/admin/carte" className={linkClass(carteActive)}>
            Carte
          </Link>
          <button
            type="button"
            onClick={logout}
            disabled={busy}
            className="ml-1 hidden h-11 shrink-0 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-semibold disabled:opacity-60 sm:flex"
          >
            <DoorIcon />
            Se déconnecter
          </button>
        </nav>
      </div>
    </header>
  );
}
