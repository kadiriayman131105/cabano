"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { confirmAction } from "@/components/ConfirmDialog";
import { CustomerReach } from "@/components/admin/CustomerReach";
import { MonthChart } from "@/components/admin/MonthChart";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatusSelect } from "@/components/admin/StatusSelect";
import type { AdminSnapshot, StatusFilter, StoreFilter } from "@/lib/adminStats";
import { clampDay } from "@/lib/adminStats";
import { casablancaToday, daysInMonth } from "@/lib/casablanca";
import { optionNote } from "@/lib/plate";
import { formatPrice, itemSpice, statusLabel } from "@/lib/format";
import { notifySaved } from "@/lib/notify";
import { getStore } from "@/data/stores";
import type { OrderStatus } from "@/types";

const stores: { id: StoreFilter; label: string }[] = [
  { id: "all", label: "Les deux" },
  { id: "casablanca", label: "Casablanca" },
  { id: "bouskoura", label: "Bouskoura" },
];

const statuses: StatusFilter[] = [
  "all",
  "pending",
  "accepted",
  "preparing",
  "delivering",
  "delivered",
  "cancelled",
];

const emptySnapshot: AdminSnapshot = {
  orders: [],
  days: [],
  dishes: [],
  kpis: { orders: 0, revenue: 0, pending: 0, average: 0 },
};

export function Dashboard() {
  const router = useRouter();
  const today = casablancaToday();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(today);
  const [store, setStore] = useState<StoreFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [snapshot, setSnapshot] = useState<AdminSnapshot>(emptySnapshot);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const seen = new Set<string>();
    let seeded = false;

    async function load() {
      const params = new URLSearchParams({ month, day, store, status });
      const response = await fetch(`/api/admin/orders?${params}`);
      if (response.status === 401) {
        router.push("/admin/login");
        router.refresh();
        return;
      }
      if (!response.ok) {
        if (!cancelled) setError("Impossible de charger les commandes.");
        return;
      }
      const data = (await response.json()) as AdminSnapshot;
      if (cancelled) return;
      if (!seeded) {
        for (const order of data.orders) seen.add(order.id);
        seeded = true;
        setFresh(new Set());
      } else {
        const arrived = data.orders
          .filter((order) => order.status === "pending" && !seen.has(order.id))
          .map((order) => order.id);
        for (const order of data.orders) seen.add(order.id);
        if (arrived.length > 0) {
          setFresh((current) => new Set([...current, ...arrived]));
        }
      }
      setSnapshot(data);
      setError("");
    }

    load();
    const timer = window.setInterval(load, 10000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [month, day, store, status, router]);

  const dayCount = daysInMonth(month);
  const fieldClass =
    "mt-1 h-12 w-full rounded-2xl border border-ink/15 bg-white px-4 text-base font-normal outline-none focus:border-octopus";

  async function changeStatus(orderId: string, next: OrderStatus) {
    const current = snapshot.orders.find((order) => order.id === orderId);
    if (!current || current.status === next) return;
    const ok = await confirmAction({
      title: "Changer l’état ?",
      message: `${statusLabel[next]}`,
      confirmLabel: "Confirmer",
      danger: next === "cancelled",
    });
    if (!ok) return;
    setBusyId(orderId);
    setRowError(null);
    const response = await fetch(`/api/admin/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; status?: OrderStatus } | null;
    if (response.status === 401) {
      router.push("/admin/login");
      router.refresh();
      return;
    }
    if (!response.ok || !body?.status) {
      setRowError({ id: orderId, message: body?.error ?? "Statut non enregistré." });
      setBusyId("");
      return;
    }
    const saved = body.status;
    setSnapshot((currentSnapshot) => ({
      ...currentSnapshot,
      orders: currentSnapshot.orders.flatMap((order) => {
        if (order.id !== orderId) return [order];
        if (status !== "all" && saved !== status) return [];
        return [{ ...order, status: saved }];
      }),
    }));
    setBusyId("");
    notifySaved("État enregistré.");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4">
      <div className="z-30 -mx-4 border-b border-ink/10 bg-[#f4f7fb]/95 px-4 py-4 md:sticky md:top-[var(--admin-header-h)] md:backdrop-blur-md">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">Commandes</h1>
        <div className="mt-4 flex flex-wrap gap-2">
          {stores.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStore(option.id)}
              className={`h-11 rounded-full px-4 text-sm font-semibold ${
                store === option.id ? "bg-ink text-white" : "bg-white text-ink"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="block min-w-0 text-sm font-semibold text-ink">
            Mois
            <input
              type="month"
              value={month}
              onChange={(event) => {
                const next = event.target.value;
                if (!next) return;
                setMonth(next);
                setDay((current) => (current === "all" ? "all" : clampDay(next, `${next}-${current.slice(-2)}`)));
              }}
              className={fieldClass}
            />
          </label>
          <label className="block min-w-0 text-sm font-semibold text-ink">
            Jour
            <select value={day} onChange={(event) => setDay(event.target.value)} className={fieldClass}>
              <option value="all">Tout le mois</option>
              {Array.from({ length: dayCount }, (_, index) => {
                const date = `${month}-${String(index + 1).padStart(2, "0")}`;
                return (
                  <option key={date} value={date}>
                    {date === today ? `${index + 1} · aujourd’hui` : String(index + 1)}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="block min-w-0 text-sm font-semibold text-ink">
            Afficher
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              className={fieldClass}
            >
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option === "all" ? "Toutes les commandes" : statusLabel[option as OrderStatus]}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm font-medium text-coral">{error}</p> : null}

      <section className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-lg font-bold text-ink">Liste</h2>
          <p className="text-sm text-ink/60">
            {snapshot.orders.length} {snapshot.orders.length > 1 ? "commandes" : "commande"}
          </p>
        </div>
        <div className="mt-3 space-y-4">
          {snapshot.orders.length === 0 ? (
            <p className="rounded-[28px] bg-white px-5 py-10 text-center text-sm text-ink/60 shadow-sm">
              Aucune commande pour ces filtres.
            </p>
          ) : (
            snapshot.orders.map((order) => {
              const shop = getStore(order.storeId);
              const isFresh = fresh.has(order.id);
              return (
                <article
                  key={order.id}
                  className={`rounded-[28px] bg-white p-4 shadow-sm sm:p-5 ${isFresh ? "ring-2 ring-coral" : ""}`}
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
                    <Link href={`/admin/orders/${order.id}`} className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-all text-base font-bold text-ink sm:text-lg">{order.id}</p>
                          <p className="mt-1 text-sm text-ink/70">
                            {shop?.city} · {order.customer.firstName} {order.customer.lastName}
                          </p>
                          <p className="mt-1 text-sm text-ink/60">{formatClock(order.createdAt)}</p>
                        </div>
                        <p className="shrink-0 text-lg font-bold text-coral">{formatPrice(order.total)}</p>
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm text-ink/70">
                        {order.items
                          .map((item) => {
                            const detail = [
                              itemSpice(item.spicy),
                              ...(item.options ?? []).map((option) => optionNote(option)),
                              item.comment,
                            ]
                              .filter(Boolean)
                              .join(", ");
                            return detail ? `${item.qty} × ${item.name} (${detail})` : `${item.qty} × ${item.name}`;
                          })
                          .join(" · ")}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <StatusPill status={order.status} />
                        {isFresh ? <span className="text-xs font-semibold text-coral">Nouvelle</span> : null}
                      </div>
                    </Link>
                    <div className="w-full lg:w-64">
                      <StatusSelect
                        status={order.status}
                        disabled={busyId === order.id}
                        onChange={(next) => changeStatus(order.id, next)}
                      />
                      {rowError?.id === order.id ? (
                        <p className="mt-2 text-sm font-medium text-coral">{rowError.message}</p>
                      ) : null}
                      <div className="mt-3">
                        <CustomerReach order={order} />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Commandes" value={String(snapshot.kpis.orders)} />
        <Kpi label="Chiffre" value={formatPrice(snapshot.kpis.revenue)} />
        <Kpi label="En attente" value={String(snapshot.kpis.pending)} />
        <Kpi label="Ticket moyen" value={formatPrice(snapshot.kpis.average)} />
      </section>

      <section className="mt-4 grid gap-3 lg:grid-cols-2">
        <ChartCard title="Commandes par jour">
          <MonthChart days={snapshot.days} store={store} selectedDay={day} mode="orders" />
          <Legend store={store} />
        </ChartCard>
        <ChartCard title="Chiffre par jour">
          <MonthChart days={snapshot.days} store={store} selectedDay={day} mode="revenue" />
          <Legend store={store} />
        </ChartCard>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 shadow-sm">
        <h2 className="font-bold text-ink">Plats les plus commandés</h2>
        {snapshot.dishes.length === 0 ? (
          <p className="mt-3 text-sm text-ink/60">Aucune vente sur cette période.</p>
        ) : (
          <ol className="mt-3 space-y-2">
            {snapshot.dishes.map((dish, index) => (
              <li key={dish.name} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0 break-words">
                  {index + 1}. {dish.name}
                </span>
                <span className="shrink-0 text-right font-semibold">
                  {dish.qty} · {formatPrice(dish.revenue)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>

    </main>
  );
}

function formatClock(iso: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Casablanca",
  }).format(new Date(iso));
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-3xl bg-white p-3 shadow-sm sm:p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="mt-1 break-words text-lg font-bold text-ink sm:text-xl">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-3xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Legend({ store }: { store: StoreFilter }) {
  return (
    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-ink/70">
      {store !== "bouskoura" ? (
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-octopus" /> Casablanca
        </span>
      ) : null}
      {store !== "casablanca" ? (
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-coral" /> Bouskoura
        </span>
      ) : null}
    </div>
  );
}
