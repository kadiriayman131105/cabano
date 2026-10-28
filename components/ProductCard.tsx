"use client";

import Image from "next/image";
import { useState } from "react";
import { CompositionList } from "@/components/CompositionList";
import { confirmAction } from "@/components/ConfirmDialog";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { formatPrice } from "@/lib/format";
import { notifySaved } from "@/lib/notify";
import { MAX_LINE_QTY } from "@/lib/limits";
import { pricePlate, type PlateChoice } from "@/lib/plate";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

type ProductCardProps = {
  product: Product;
  onOpen: (product: Product) => void;
  onAdd: (product: Product, qty: number, choices?: PlateChoice[]) => boolean;
  closed?: boolean;
};

export function ProductCard({ product, onOpen, onAdd, closed = false }: ProductCardProps) {
  const ready = useCartReady();
  const inCart = useCartStore((state) =>
    state.items.reduce((sum, item) => (item.productId === product.id ? sum + item.qty : sum), 0),
  );
  const setQty = useCartStore((state) => state.setQty);
  const shown = ready ? inCart : 0;
  const catalog = product.options ?? [];
  const composed = catalog.length > 0;
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries(catalog.map((option) => [option.id, option.included ? 1 : 0])),
  );
  const priced = pricePlate(
    product.price,
    catalog,
    catalog.map((option) => ({ id: option.id, qty: picked[option.id] ?? (option.included ? 1 : 0) })),
  );

  function addOne() {
    if (closed) return;
    if (composed && open) {
      onAdd(product, 1, priced.options);
      return;
    }
    if (composed) {
      onOpen(product);
      return;
    }
    onAdd(product, 1);
  }

  async function removeOne() {
    if (shown <= 1) {
      const ok = await confirmAction({
        title: "Retirer du panier ?",
        message: product.name,
        confirmLabel: "Retirer",
        danger: true,
      });
      if (!ok) return;
      setQty(product.id, 0);
      notifySaved("Retiré du panier.");
      return;
    }
    setQty(product.id, shown - 1);
  }

  return (
    <article className="border-b border-ink/10 py-4 last:border-b-0">
      <div className="flex items-start gap-4">
      <div className="min-w-0 flex-1">
        <button type="button" onClick={() => onOpen(product)} className="press w-full text-left">
          <h3 className="break-words text-[15px] font-semibold leading-snug text-ink">{product.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-ink/55">{product.description}</p>
          <p className="mt-2 text-sm font-bold text-coral">
            {formatPrice(open ? priced.unitPrice : product.price)}
          </p>
        </button>
        {composed ? (
          <div className="mt-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink">
              <input
                type="checkbox"
                checked={open}
                onChange={(event) => setOpen(event.target.checked)}
                className="h-5 w-5 accent-octopus"
              />
              Composition
            </label>
            {open ? null : (
              <p className="mt-1 text-xs leading-relaxed text-ink/55">{catalog.map((option) => option.name).join(" · ")}</p>
            )}
          </div>
        ) : null}
      </div>
      <div className="relative h-[88px] w-[88px] shrink-0 sm:h-[104px] sm:w-[104px]">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            width={192}
            height={192}
            unoptimized
            className="h-[88px] w-[88px] rounded-2xl object-cover sm:h-[104px] sm:w-[104px]"
          />
        ) : (
          <PhotoPlaceholder className="h-[88px] w-[88px] rounded-2xl sm:h-[104px] sm:w-[104px]" />
        )}
        {composed ? (
          <>
            {shown > 0 ? (
              <span className="absolute -left-1 -top-1 flex h-7 min-w-7 items-center justify-center rounded-full bg-octopus px-1 text-xs font-bold text-white">
                {shown}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Composer ${product.name}`}
              onClick={addOne}
              disabled={closed}
              className="press absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-octopus text-2xl font-bold leading-none text-white shadow-md disabled:bg-ink/20"
            >
              +
            </button>
          </>
        ) : shown > 0 ? (
          <div className="absolute -bottom-2 left-1/2 flex -translate-x-1/2 items-center rounded-full bg-white shadow-md ring-1 ring-octopus">
            <button
              type="button"
              aria-label={shown === 1 ? "Retirer du panier" : "Diminuer la quantité"}
              onClick={() => void removeOne()}
              className="press h-9 w-8 text-lg font-bold text-ink"
            >
              −
            </button>
            <span key={shown} className="animate-pop min-w-5 px-1 text-center text-sm font-bold text-octopus">
              {shown}
            </span>
            <button
              type="button"
              aria-label="Augmenter la quantité"
              onClick={addOne}
              disabled={closed || shown >= MAX_LINE_QTY}
              className="press h-9 w-8 text-lg font-bold text-ink disabled:text-ink/30"
            >
              +
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label={`Ajouter ${product.name}`}
            onClick={addOne}
            disabled={closed || shown >= MAX_LINE_QTY}
            className="press absolute -bottom-1 -right-1 flex h-10 w-10 items-center justify-center rounded-full bg-octopus text-2xl font-bold leading-none text-white shadow-md disabled:bg-ink/20"
          >
            +
          </button>
        )}
      </div>
      </div>
      {composed && open ? (
        <CompositionList
          catalog={catalog}
          picked={picked}
          onChange={(id, next) => setPicked((current) => ({ ...current, [id]: next }))}
        />
      ) : null}
    </article>
  );
}
