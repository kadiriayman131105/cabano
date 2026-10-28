import { daysInMonth, monthBounds } from "@/lib/casablanca";
import type { DatedOrder } from "@/lib/orderRecords";
import type { OrderStatus } from "@/types";

export type StoreFilter = "all" | "casablanca" | "bouskoura";
export type StatusFilter = "all" | OrderStatus;

export type DayPoint = {
  date: string;
  casablanca: { orders: number; revenue: number };
  bouskoura: { orders: number; revenue: number };
};

export type AdminSnapshot = {
  orders: DatedOrder[];
  days: DayPoint[];
  dishes: { name: string; qty: number; revenue: number }[];
  kpis: { orders: number; revenue: number; pending: number; average: number };
};

function matchesStore(order: DatedOrder, store: StoreFilter) {
  return store === "all" || order.storeId === store;
}

function matchesStatus(order: DatedOrder, status: StatusFilter) {
  return status === "all" || order.status === status;
}

function saleOrders(orders: DatedOrder[], status: StatusFilter) {
  if (status === "cancelled") return orders;
  return orders.filter((order) => order.status !== "cancelled");
}

export function buildSnapshot(
  monthOrders: DatedOrder[],
  filters: { store: StoreFilter; status: StatusFilter; day: string; month: string },
): AdminSnapshot {
  const inStore = monthOrders.filter((order) => matchesStore(order, filters.store));
  const period =
    filters.day === "all" ? inStore : inStore.filter((order) => order.localDate === filters.day);
  const listed = period.filter((order) => matchesStatus(order, filters.status));
  const sales = saleOrders(listed, filters.status);
  const revenue = sales.reduce((sum, order) => sum + order.total, 0);
  const pending = period.filter((order) => order.status === "pending").length;

  const chartSource =
    filters.status === "all" ? inStore.filter((order) => order.status !== "cancelled") : inStore.filter((order) => matchesStatus(order, filters.status));

  const bounds = monthBounds(filters.month);
  const days: DayPoint[] = bounds.dates.map((date) => ({
    date,
    casablanca: { orders: 0, revenue: 0 },
    bouskoura: { orders: 0, revenue: 0 },
  }));
  const byDate = new Map(days.map((day) => [day.date, day]));
  for (const order of chartSource) {
    const point = byDate.get(order.localDate);
    if (!point) continue;
    const bucket = order.storeId === "bouskoura" ? point.bouskoura : point.casablanca;
    bucket.orders += 1;
    bucket.revenue += order.total;
  }

  const dishes = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const order of sales) {
    for (const item of order.items) {
      const current = dishes.get(item.name) ?? { name: item.name, qty: 0, revenue: 0 };
      current.qty += item.qty;
      current.revenue += item.lineTotal;
      dishes.set(item.name, current);
    }
  }

  return {
    orders: listed,
    days,
    dishes: [...dishes.values()].sort((a, b) => b.qty - a.qty).slice(0, 8),
    kpis: {
      orders: listed.length,
      revenue,
      pending,
      average: sales.length ? Math.round(revenue / sales.length) : 0,
    },
  };
}

export function clampDay(month: string, day: string) {
  if (day === "all") return day;
  const count = daysInMonth(month);
  const number = Number(day.slice(-2));
  if (!number || number < 1) return `${month}-01`;
  return `${month}-${String(Math.min(number, count)).padStart(2, "0")}`;
}
