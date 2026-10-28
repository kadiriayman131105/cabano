"use client";

import { useEffect, useMemo, useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { CategoryTabs } from "@/components/CategoryTabs";
import { OpenBadge } from "@/components/OpenBadge";
import { StoreCover } from "@/components/StoreCover";
import { ProductCard } from "@/components/ProductCard";
import { ProductSheet } from "@/components/ProductSheet";
import { getStore } from "@/data/stores";
import { formatPhone, formatPrice } from "@/lib/format";
import { CLOSED_MESSAGE, isOpenNow } from "@/lib/hours";
import { MAX_DISTINCT_MESSAGE } from "@/lib/limits";
import { notifyError } from "@/lib/notify";
import { useStoreOpen } from "@/lib/useStoreOpen";
import type { PlateChoice } from "@/lib/plate";
import { useCartStore } from "@/store/cartStore";
import type { MenuSection, Product, Store } from "@/types";

type PendingAdd = { product: Product; qty: number; choices?: PlateChoice[] };

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function StoreMenu({ store, sections }: { store: Store; sections: MenuSection[] }) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? "");
  const [pending, setPending] = useState<PendingAdd | null>(null);
  const [selected, setSelected] = useState<Product | null>(null);
  const [query, setQuery] = useState("");
  const open = useStoreOpen();
  const closed = open === false;
  const addItem = useCartStore((state) => state.addItem);
  const clear = useCartStore((state) => state.clear);
  const cartStoreId = useCartStore((state) => state.storeId);
  const otherStore = cartStoreId ? getStore(cartStoreId) : undefined;

  const visibleSections = useMemo(() => {
    const needle = normalize(query.trim());
    return sections
      .map((section) => {
        const groups = section.groups
          .map((group) => ({
            ...group,
            products: needle
              ? group.products.filter((product) =>
                  normalize(`${product.name} ${product.description}`).includes(needle),
                )
              : group.products,
          }))
          .filter((group) => group.products.length > 0);
        return { ...section, groups, products: groups.flatMap((group) => group.products) };
      })
      .filter((section) => section.groups.length > 0);
  }, [query, sections]);

  const highlightedId = visibleSections.some((section) => section.id === activeId)
    ? activeId
    : (visibleSections[0]?.id ?? "");

  useEffect(() => {
    const nodes = visibleSections
      .map((section) => document.getElementById(section.id))
      .filter((node): node is HTMLElement => node !== null);
    if (nodes.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveId(visible.target.id);
      },
      { rootMargin: "-30% 0px -55% 0px", threshold: [0.2, 0.6] },
    );

    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [visibleSections]);

  function requestAdd(product: Product, qty: number, choices?: PlateChoice[]) {
    if (!isOpenNow()) {
      notifyError(CLOSED_MESSAGE);
      return false;
    }
    const result = addItem(store.id, product, qty, choices);
    if (result === "store-mismatch") {
      setPending({ product, qty, choices });
      return false;
    }
    if (result === "too-many") {
      notifyError(MAX_DISTINCT_MESSAGE);
      return false;
    }
    return true;
  }

  function confirmSwitch() {
    if (!pending) return;
    if (!isOpenNow()) {
      notifyError(CLOSED_MESSAGE);
      setPending(null);
      return;
    }
    clear();
    addItem(store.id, pending.product, pending.qty, pending.choices);
    setPending(null);
    setSelected(null);
  }

  function selectCategory(id: string) {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <main className="pb-8">
      <StoreCover storeId={store.id} className="h-48 w-full sm:h-56" />
      <div className="relative z-10 -mt-10 mx-auto w-full max-w-3xl px-4">
        <div className="rounded-[28px] bg-white p-4 shadow-[0_12px_40px_rgba(10,20,40,0.08)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-octopus">{store.area}</p>
              <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink sm:text-3xl">{store.name}</h1>
            </div>
            <OpenBadge />
          </div>
          <p className="mt-2 text-sm text-ink/60">
            {formatPhone(store.phone)} · {store.hours}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-sea px-3 py-1 text-xs font-semibold text-ink">
              Livraison {formatPrice(store.deliveryFee)}
            </span>
            <span className="rounded-full bg-sea px-3 py-1 text-xs font-semibold text-ink">
              Espèces à la livraison
            </span>
          </div>
          {closed ? <p className="mt-3 text-sm font-semibold text-coral">{CLOSED_MESSAGE}</p> : null}
        </div>

        <label className="relative mt-4 block">
          <span className="sr-only">Rechercher un plat</span>
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ink/35">
            <SearchIcon />
          </span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un plat"
            className="h-12 w-full rounded-2xl border border-transparent bg-white pl-11 pr-4 text-base shadow-sm outline-none focus:border-octopus"
          />
        </label>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4">
        <CategoryTabs sections={visibleSections} activeId={highlightedId} onSelect={selectCategory} />

        {visibleSections.length === 0 ? (
          <p className="py-16 text-center text-ink/70">
            {query.trim() ? "Aucun plat pour cette recherche." : "Aucun plat pour le moment."}
          </p>
        ) : (
          <div className="mt-2 space-y-6">
            {visibleSections.map((section) => (
              <section key={section.id} id={section.id} className="scroll-mt-[calc(var(--header-h)+4.5rem)]">
                <h2 className="mb-2 px-1 text-xl font-bold tracking-tight text-ink">{section.label}</h2>
                <div className="rounded-[28px] bg-white px-3 shadow-[0_8px_30px_rgba(10,20,40,0.05)] sm:px-4">
                  {section.groups.map((group) => (
                    <div key={group.id}>
                      {section.groups.length > 1 ||
                      group.label.trim().toLocaleLowerCase("fr") !== section.label.trim().toLocaleLowerCase("fr") ? (
                        <h3 className="pt-4 text-sm font-semibold text-octopus">{group.label}</h3>
                      ) : null}
                      {group.products.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product}
                          onOpen={setSelected}
                          onAdd={requestAdd}
                          closed={closed}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <ProductSheet
        product={selected}
        onClose={() => setSelected(null)}
        onAdd={requestAdd}
        closed={closed}
      />

      <BottomSheet
        open={pending !== null}
        onClose={() => setPending(null)}
        labelledBy="switch-store-title"
        z="z-[60]"
      >
        <div className="p-5">
          <h2 id="switch-store-title" className="text-lg font-bold text-ink">
            Changer de magasin ?
          </h2>
          <p className="mt-2 text-sm text-ink/80">
            Votre panier contient des articles de {otherStore?.name ?? "un autre magasin"}. Le vider
            pour ajouter des produits de {store.name} ?
          </p>
          <div className="mt-5 flex gap-3">
            <button
              type="button"
              onClick={() => setPending(null)}
              className="press h-12 flex-1 rounded-full border border-ink/15 font-semibold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={confirmSwitch}
              className="press h-12 flex-1 rounded-full bg-octopus font-semibold text-white"
            >
              Vider et ajouter
            </button>
          </div>
        </div>
      </BottomSheet>
    </main>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
      <path d="M16 16.5 20 20.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
