import { statusLabel, statusOptions } from "@/lib/format";
import type { OrderStatus } from "@/types";

const fieldClass =
  "mt-1 h-12 w-full rounded-2xl border border-ink/15 bg-white px-3 text-base font-semibold text-ink outline-none focus:border-octopus disabled:opacity-60";

export function StatusSelect({
  status,
  disabled = false,
  onChange,
}: {
  status: OrderStatus;
  disabled?: boolean;
  onChange: (status: OrderStatus) => void;
}) {
  const options = statusOptions(status);

  return (
    <label className="block min-w-0">
      <span className="text-xs font-semibold uppercase tracking-wide text-ink/50">État</span>
      <select
        value={status}
        disabled={disabled || options.length === 1}
        onChange={(event) => {
          const next = event.target.value as OrderStatus;
          event.currentTarget.value = status;
          onChange(next);
        }}
        className={fieldClass}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {statusLabel[option]}
          </option>
        ))}
      </select>
    </label>
  );
}
