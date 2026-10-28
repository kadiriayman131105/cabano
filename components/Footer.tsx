"use client";

import { usePathname } from "next/navigation";
import { SocialLinks } from "@/components/SocialLinks";
import { stores } from "@/data/stores";
import { formatPhone } from "@/lib/format";

export function Footer() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;
  return (
    <footer className="mt-auto border-t border-ink/10 px-4 py-8 pb-[max(7rem,env(safe-area-inset-bottom,0px))] text-center text-sm text-ink/60">
      <p className="font-semibold tracking-[0.16em] text-ink">CABANO</p>
      <p className="mt-2">Paiement en espèces à la livraison</p>
      <p className="mx-auto mt-1 max-w-md break-words">
        {stores.map((store) => `${store.city} ${formatPhone(store.phone)}`).join(" · ")}
      </p>
      <SocialLinks />
    </footer>
  );
}
