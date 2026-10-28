import Image from "next/image";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { PlateNotes } from "@/components/PlateNotes";
import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPrice } from "@/lib/format";
import { MAX_LINE_COMMENT, MAX_LINE_QTY } from "@/lib/limits";
import type { CartItem } from "@/types";

type CartItemRowProps = {
  item: CartItem;
  onQty: (qty: number) => void;
  onComment: (comment: string) => void;
};

export function CartItemRow({ item, onQty, onComment }: CartItemRowProps) {
  return (
    <li className="flex gap-3 border-b border-ink/10 py-4 last:border-b-0">
      {item.image ? (
        <Image
          src={item.image}
          alt=""
          width={128}
          height={128}
          unoptimized
          className="h-20 w-20 shrink-0 rounded-2xl object-cover"
        />
      ) : (
        <PhotoPlaceholder className="h-20 w-20 shrink-0 rounded-2xl" />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">{item.name}</p>
            <PlateNotes options={item.options} />
          </div>
          <p className="shrink-0 font-bold text-coral">{formatPrice(item.unitPrice * item.qty)}</p>
        </div>
        <p className="mt-1 text-sm text-ink/55">{formatPrice(item.unitPrice)} / pièce</p>
        <label className="mt-3 block">
          <span className="sr-only">Commentaire pour {item.name}</span>
          <input
            value={item.comment ?? ""}
            onChange={(event) => onComment(event.target.value)}
            maxLength={MAX_LINE_COMMENT}
            placeholder="Commentaire : épicé, sans oignon…"
            className="h-11 w-full rounded-2xl border border-ink/15 px-3 text-base outline-none focus:border-octopus"
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <QuantityStepper value={item.qty} min={0} max={MAX_LINE_QTY} onChange={onQty} />
          <button type="button" onClick={() => onQty(0)} className="text-sm font-semibold text-coral">
            Retirer
          </button>
        </div>
      </div>
    </li>
  );
}
