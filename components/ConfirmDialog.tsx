"use client";

import { useEffect, useSyncExternalStore } from "react";

type Ask = {
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  resolve: (ok: boolean) => void;
};

let ask: Ask | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function close(ok: boolean) {
  const current = ask;
  ask = null;
  emit();
  current?.resolve(ok);
}

export function confirmAction(input: {
  title: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  return new Promise<boolean>((resolve) => {
    if (ask) ask.resolve(false);
    ask = {
      title: input.title,
      message: input.message ?? "",
      confirmLabel: input.confirmLabel ?? "Confirmer",
      danger: Boolean(input.danger),
      resolve,
    };
    emit();
  });
}

export function ConfirmHost() {
  const current = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => ask,
    () => null,
  );

  useEffect(() => {
    if (!current) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [current]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-3 sm:items-center">
      <button
        type="button"
        aria-label="Annuler"
        className="animate-fade absolute inset-0 bg-ink/50"
        onClick={() => close(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="animate-sheet relative mb-[env(safe-area-inset-bottom,0px)] w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl sm:mb-0"
      >
        <h2 id="confirm-title" className="text-lg font-bold text-ink">
          {current.title}
        </h2>
        {current.message ? <p className="mt-2 text-sm text-ink/70">{current.message}</p> : null}
        <div className="mt-5 flex gap-3">
          <button
            type="button"
            onClick={() => close(false)}
            className="press h-12 flex-1 rounded-full border border-ink/15 font-semibold text-ink"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => close(true)}
            className={`press h-12 flex-1 rounded-full font-semibold text-white ${
              current.danger ? "bg-coral" : "bg-ink"
            }`}
          >
            {current.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
