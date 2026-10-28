"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

let scrollLocks = 0;

function lockScroll() {
  scrollLocks += 1;
  document.body.style.overflow = "hidden";
}

function unlockScroll() {
  scrollLocks = Math.max(0, scrollLocks - 1);
  if (scrollLocks === 0) document.body.style.overflow = "";
}

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  children: ReactNode;
  z?: string;
};

export function BottomSheet({ open, onClose, labelledBy, children, z = "z-50" }: BottomSheetProps) {
  useEffect(() => {
    if (!open) return;
    lockScroll();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className={`fixed inset-0 ${z} flex items-end justify-center sm:items-center sm:p-4`}>
      <button
        type="button"
        aria-label="Fermer"
        className="animate-fade absolute inset-0 bg-ink/50"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className="animate-sheet relative flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
      >
        <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-ink/15 sm:hidden" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
