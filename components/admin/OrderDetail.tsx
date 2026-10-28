"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { confirmAction } from "@/components/ConfirmDialog";
import { CustomerReach } from "@/components/admin/CustomerReach";
import { PlateNotes } from "@/components/PlateNotes";
import { SpiceMark } from "@/components/SpiceChoice";
import { DeliveryMap } from "@/components/DeliveryMap";
import { StatusPill } from "@/components/admin/StatusPill";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { getStore } from "@/data/stores";
import { formatDateTime, formatPhone, formatPrice, statusLabel } from "@/lib/format";
import { notifyError, notifySaved } from "@/lib/notify";
import type { Order, OrderStatus } from "@/types";

const nextStep: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  pending: { status: "accepted", label: "Accepter" },
  accepted: { status: "preparing", label: "En préparation" },
  preparing: { status: "delivering", label: "En livraison" },
  delivering: { status: "delivered", label: "Marquer livrée" },
};

export function OrderDetail({ id }: { id: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/orders/${id}`)
      .then(async (response) => {
        if (response.status === 401) {
          router.push("/admin/login");
          router.refresh();
          return null;
        }
        if (!response.ok) return null;
        return (await response.json()) as Order;
      })
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  async function move(status: OrderStatus) {
    if (!order || status === order.status) return;
    const ok = await confirmAction({
      title: "Changer l’état ?",
      message: statusLabel[status],
      confirmLabel: "Confirmer",
      danger: status === "cancelled",
    });
    if (!ok) return;
    setBusy(true);
    setError("");
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string; status?: OrderStatus } | null;
    if (!response.ok || !body?.status) {
      setError(body?.error ?? "Statut non enregistré.");
      notifyError(body?.error ?? "Statut non enregistré.");
      setBusy(false);
      return;
    }
    setOrder({ ...order, status: body.status });
    setBusy(false);
    notifySaved("État enregistré.");
  }

  if (order === undefined) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-ink">Commande introuvable</h1>
        <Link href="/admin" className="mt-6 inline-flex h-11 items-center rounded-full bg-ink px-5 font-semibold text-white">
          Retour
        </Link>
      </main>
    );
  }

  const shop = getStore(order.storeId);
  const location = order.customer.location ?? null;
  const step = nextStep[order.status];

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <Link href="/admin" className="text-sm font-semibold text-octopus">
        Retour aux commandes
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-ink">{order.id}</h1>
        <StatusPill status={order.status} />
      </div>
      <p className="mt-2 text-sm text-ink/70">
        {shop?.name} · {formatDateTime(order.createdAt)}
      </p>

      <section className="mt-6 rounded-3xl bg-white p-5 shadow-sm">
        <ul className="divide-y divide-ink/10">
          {order.items.map((item, index) => (
            <li key={`${item.productId}-${index}`} className="flex items-start justify-between gap-3 py-3 text-sm">
              <span>
                {item.qty} × {item.name}
                <SpiceMark spicy={item.spicy} />
                <PlateNotes options={item.options} />
                {item.comment ? <span className="mt-0.5 block text-xs text-ink/60">{item.comment}</span> : null}
              </span>
              <span className="font-semibold">{formatPrice(item.lineTotal)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-2 space-y-1 border-t border-ink/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Sous-total</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Livraison</dt>
            <dd>{formatPrice(order.deliveryFee)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd className="text-coral">{formatPrice(order.total)}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-4 rounded-3xl bg-white p-5 text-sm shadow-sm">
        <h2 className="font-bold text-ink">Client</h2>
        <p className="mt-2">
          {order.customer.firstName} {order.customer.lastName}
        </p>
        <p className="mt-1 font-semibold">{formatPhone(order.customer.phone)}</p>
        <div className="mt-3">
          <CustomerReach order={order} />
        </div>
        <p className="mt-2">
          {order.customer.address}, {order.customer.city}
        </p>
        {location ? (
          <div className="mt-3">
            <DeliveryMap center={location} value={location} interactive={false} />
          </div>
        ) : null}
        {order.note ? <p className="mt-3 text-ink/70">Note : {order.note}</p> : null}
        <p className="mt-3 font-semibold">Paiement à la livraison</p>
      </section>

      <div className="mt-4 max-w-sm">
        <StatusSelect status={order.status} disabled={busy} onChange={move} />
      </div>
      {error ? <p className="mt-4 text-sm text-coral">{error}</p> : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {step ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => move(step.status)}
            className="press h-12 rounded-full bg-octopus px-5 font-semibold text-white disabled:opacity-60"
          >
            {step.label}
          </button>
        ) : null}
        {order.status !== "delivered" && order.status !== "cancelled" ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => move("cancelled")}
            className="press h-12 rounded-full border border-coral px-5 font-semibold text-coral disabled:opacity-60"
          >
            Annuler
          </button>
        ) : null}
      </div>
    </main>
  );
}
