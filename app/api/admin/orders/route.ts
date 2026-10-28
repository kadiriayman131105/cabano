import { buildSnapshot, type StatusFilter, type StoreFilter } from "@/lib/adminStats";
import { monthBounds } from "@/lib/casablanca";
import { listOrdersBetween } from "@/lib/orderRecords";
import { requireAdmin } from "@/lib/session";

const stores = new Set(["all", "casablanca", "bouskoura"]);
const statuses = new Set<StatusFilter>([
  "all",
  "pending",
  "accepted",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
]);

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const url = new URL(request.url);
  const month = url.searchParams.get("month") ?? "";
  const day = url.searchParams.get("day") ?? "all";
  const store = url.searchParams.get("store") ?? "all";
  const status = url.searchParams.get("status") ?? "all";

  if (!/^\d{4}-\d{2}$/.test(month) || !stores.has(store) || !statuses.has(status as StatusFilter)) {
    return Response.json({ error: "Filtre invalide." }, { status: 400 });
  }

  const bounds = monthBounds(month);
  const orders = listOrdersBetween(bounds.start, bounds.end);
  const snapshot = buildSnapshot(orders, {
    month,
    day: day === "all" || bounds.dates.includes(day) ? day : "all",
    store: store as StoreFilter,
    status: status as StatusFilter,
  });
  return Response.json(snapshot);
}
