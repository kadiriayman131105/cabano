"use client";

import { QuantityStepper } from "@/components/QuantityStepper";
import { formatPrice } from "@/lib/format";
import { MAX_OPTION_QTY } from "@/lib/limits";
import type { ProductOption } from "@/types";

export function CompositionList({
  catalog,
  picked,
  onChange,
}: {
  catalog: ProductOption[];
  picked: Record<string, number>;
  onChange: (id: string, qty: number) => void;
}) {
  return (
    <ul className="mt-2 divide-y divide-ink/10">
      {catalog.map((option) => {
        const count = picked[option.id] ?? (option.included ? 1 : 0);
        const included = option.included ? 1 : 0;
        const extra = Math.max(0, count - included);
        const hint =
          count === 0 && included > 0
            ? "Sans"
            : extra > 0
              ? `Extra + ${formatPrice(option.extraPrice * extra)}`
              : option.included
                ? "Inclus"
                : `+ ${formatPrice(option.extraPrice)}`;
        return (
          <li key={option.id} className="flex items-center justify-between gap-3 py-3">
            <div className="min-w-0">
              <p className="font-semibold text-ink">{option.name}</p>
              <p className="text-xs text-ink/55">{hint}</p>
            </div>
            <QuantityStepper
              value={count}
              min={0}
              max={MAX_OPTION_QTY}
              decreaseLabel="Retirer"
              onChange={(next) => onChange(option.id, next)}
            />
          </li>
        );
      })}
    </ul>
  );
}
