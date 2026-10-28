import { formatPrice } from "@/lib/format";

type CartSummaryProps = {
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export function CartSummary({ subtotal, deliveryFee, total }: CartSummaryProps) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(10,20,40,0.05)]">
      <h2 className="text-lg font-bold text-ink">Récapitulatif</h2>
      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-ink/70">Sous-total</dt>
          <dd className="font-semibold">{formatPrice(subtotal)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-ink/70">Livraison</dt>
          <dd className="font-semibold">{formatPrice(deliveryFee)}</dd>
        </div>
        <div className="flex justify-between gap-4 border-t border-ink/10 pt-2 text-base">
          <dt className="font-bold">Total</dt>
          <dd className="font-bold text-coral">{formatPrice(total)}</dd>
        </div>
      </dl>
    </div>
  );
}
