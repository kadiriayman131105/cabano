"use client";

import Image from "next/image";
import { useState } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { CompositionList } from "@/components/CompositionList";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPrice } from "@/lib/format";
import { MAX_LINE_QTY } from "@/lib/limits";
import { plateKey, pricePlate, type PlateChoice } from "@/lib/plate";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";
import type { Product } from "@/types";

type ProductSheetProps = {
  product: Product | null;
  onClose: () => void;
  onAdd: (product: Product, qty: number, choices?: PlateChoice[]) => boolean;
  closed?: boolean;
};

export function ProductSheet({ product, onClose, onAdd, closed = false }: ProductSheetProps) {
  return (
    <BottomSheet open={product !== null} onClose={onClose} labelledBy="product-sheet-title">
      {product ? (
        <ProductSheetBody
          key={product.id}
          product={product}
          onClose={onClose}
          onAdd={onAdd}
          closed={closed}
        />
      ) : null}
    </BottomSheet>
  );
}

function ProductSheetBody({
  product,
  onClose,
  onAdd,
  closed,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (product: Product, qty: number, choices?: PlateChoice[]) => boolean;
  closed: boolean;
}) {
  const ready = useCartReady();
  const catalog = product.options ?? [];
  const [picked, setPicked] = useState<Record<string, number>>(() =>
    Object.fromEntries(catalog.map((option) => [option.id, option.included ? 1 : 0])),
  );
  const priced = pricePlate(
    product.price,
    catalog,
    catalog.map((option) => ({ id: option.id, qty: picked[option.id] ?? (option.included ? 1 : 0) })),
  );
  const lineQty = useCartStore(
    (state) =>
      state.items.find((item) => item.productId === product.id && plateKey(item.options) === plateKey(priced.options))
        ?.qty ?? 0,
  );
  const inCart = useCartStore((state) =>
    state.items.reduce((sum, item) => (item.productId === product.id ? sum + item.qty : sum), 0),
  );
  const [qty, setQty] = useState(1);
  const room = Math.max(0, MAX_LINE_QTY - (ready ? lineQty : 0));
  const sheetQty = Math.min(qty, Math.max(room, 1));

  return (
    <>
      <div className="relative">
        {product.image ? (
          <Image
            src={product.image}
            alt={product.name}
            width={800}
            height={500}
            unoptimized
            className="aspect-[16/10] w-full object-cover"
          />
        ) : (
          <PhotoPlaceholder className="aspect-[16/10] w-full" />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Fermer la fiche"
          className="press absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold text-ink shadow"
        >
          ×
        </button>
      </div>
      <div className="overflow-y-auto px-5 pb-4 pt-4">
        <h2 id="product-sheet-title" className="text-2xl font-bold text-ink">
          {product.name}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/70">{product.description}</p>
        {catalog.length > 0 ? (
          <div className="mt-5">
            <p className="text-sm font-semibold text-ink">Composition</p>
            <p className="mt-1 text-xs leading-relaxed text-ink/55">
              Retirer un ingrédient garde le même prix. Chaque extra est ajouté au tarif indiqué.
            </p>
            <CompositionList
              catalog={catalog}
              picked={picked}
              onChange={(id, next) => setPicked((current) => ({ ...current, [id]: next }))}
            />
          </div>
        ) : null}
        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-xl font-bold text-coral">{formatPrice(priced.unitPrice)}</p>
              <QuantityStepper
                value={sheetQty}
                min={1}
                max={Math.max(room, 1)}
                onChange={setQty}
              />
        </div>
        {ready && inCart > 0 ? (
          <p className="mt-3 text-sm font-medium text-octopus">{inCart} déjà dans le panier</p>
        ) : null}
      </div>
      <div className="border-t border-ink/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              disabled={closed || room === 0}
              onClick={() => {
                if (closed || room === 0) return;
                const accepted = onAdd(product, sheetQty, priced.options);
                if (accepted) onClose();
              }}
              className="press flex h-12 w-full items-center justify-between rounded-2xl bg-ink px-5 font-semibold text-white disabled:opacity-60"
            >
              <span>{closed ? "Magasin fermé" : "Ajouter"}</span>
              <span>{formatPrice(priced.unitPrice * sheetQty)}</span>
            </button>
      </div>
    </>
  );
}
