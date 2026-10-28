"use client";

type QuantityStepperProps = {
  value: number;
  min?: number;
  max?: number;
  onChange: (qty: number) => void;
  decreaseLabel?: string;
};

export function QuantityStepper({
  value,
  min = 1,
  max,
  onChange,
  decreaseLabel,
}: QuantityStepperProps) {
  function decrease() {
    if (value <= min) return;
    onChange(value - 1);
  }

  function increase() {
    if (max !== undefined && value >= max) return;
    onChange(value + 1);
  }

  const atMin = value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-ink/15 bg-white">
      <button
        type="button"
        onClick={decrease}
        disabled={atMin}
        aria-label={
          decreaseLabel ?? (min === 0 && value === 1 ? "Retirer du panier" : "Diminuer la quantité")
        }
        className="press h-11 w-11 rounded-full text-lg font-semibold text-ink disabled:text-ink/30"
      >
        −
      </button>
      <span key={value} className="animate-pop min-w-8 px-1 text-center text-sm font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={increase}
        disabled={atMax}
        aria-label="Augmenter la quantité"
        className="press h-11 w-11 rounded-full text-lg font-semibold text-ink disabled:text-ink/30"
      >
        +
      </button>
    </div>
  );
}
