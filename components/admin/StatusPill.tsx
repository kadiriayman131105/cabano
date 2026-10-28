import type { OrderStatus } from "@/types";
import { statusLabel } from "@/lib/format";

const tone: Record<OrderStatus, string> = {
  pending: "bg-coral/10 text-coral",
  accepted: "bg-sea text-octopus",
  preparing: "bg-ink text-white",
  delivering: "bg-octopus text-white",
  delivered: "bg-success/10 text-success",
  cancelled: "bg-ink/10 text-ink/60",
};

export function StatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${tone[status]}`}>
      {statusLabel[status]}
    </span>
  );
}
