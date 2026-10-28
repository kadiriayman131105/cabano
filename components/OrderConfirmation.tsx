"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { confirmAction } from "@/components/ConfirmDialog";
import { DeliveryMap } from "@/components/DeliveryMap";
import { PlateNotes } from "@/components/PlateNotes";
import { SpiceMark } from "@/components/SpiceChoice";
import { getStore } from "@/data/stores";
import { formatDateTime, formatPhone, formatPrice, statusLabel } from "@/lib/format";
import { notifyError } from "@/lib/notify";
import { useCartStore } from "@/store/cartStore";
import type { Order, OrderStatus } from "@/types";

export function OrderConfirmation({ token }: { token: string }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [reordering, setReordering] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/orders/${token}`)
      .then(async (response) => (response.ok ? ((await response.json()) as Order) : null))
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

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
        <Link href="/" className="mt-6 inline-flex h-11 items-center rounded-full bg-octopus px-5 font-semibold text-white">
          Retour à l’accueil
        </Link>
      </main>
    );
  }

  const placed = order;
  const store = getStore(placed.storeId);
  const location = placed.customer.location ?? null;
  const mapsUrl = location
    ? `https://www.openstreetmap.org/?mlat=${location.lat}&mlon=${location.lng}#map=17/${location.lat}/${location.lng}`
    : null;

  async function reorder() {
    if (reordering) return;
    if (useCartStore.getState().items.length > 0) {
      const ok = await confirmAction({
        title: "Remplacer le panier ?",
        message: "Les plats de cette commande remplacent le panier.",
        confirmLabel: "Remplacer",
      });
      if (!ok) return;
    }
    setReordering(true);
    try {
      const response = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: placed.storeId,
          items: placed.items.map((item) => ({
            productId: item.productId,
            qty: item.qty,
            ...(item.comment ? { comment: item.comment } : {}),
            ...(item.options && item.options.length > 0
              ? { options: item.options.map((option) => ({ id: option.id, qty: option.qty })) }
              : {}),
            spicy: item.spicy === true,
          })),
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        error?: string;
        items?: {
          productId: string;
          name: string;
          unitPrice: number;
          qty: number;
          image: string | null;
          comment?: string;
          options?: { id: string; name: string; qty: number; included: number }[];
          spicy: boolean;
          spicyChoice: boolean;
        }[];
        missing?: string[];
        soldOut?: string[];
      } | null;
      if (!response.ok || !body?.items) {
        notifyError(body?.error || "Impossible de reprendre la commande.");
        return;
      }
      if (body.items.length === 0) {
        notifyError(
          body.soldOut && body.soldOut.length > 0 ? "Un plat est épuisé." : "Ces plats ne sont plus à la carte.",
        );
        return;
      }
      useCartStore.getState().replaceOrder(placed.storeId, body.items);
      if ((body.soldOut && body.soldOut.length > 0) || (body.missing && body.missing.length > 0)) {
        notifyError(
          body.soldOut && body.soldOut.length > 0
            ? "Un plat est épuisé. Il n’a pas été repris."
            : "Un plat n’est plus à la carte. Il n’a pas été repris.",
        );
      }
      router.push("/cart");
    } catch {
      notifyError("Impossible de reprendre la commande.");
    } finally {
      setReordering(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-octopus">
        Commande enregistrée
      </p>
      <h1 className="mt-2 text-3xl font-bold text-ink">{order.id}</h1>
      <p className="mt-2 text-sm text-ink/70">{formatDateTime(order.createdAt)}</p>
      <p className="mt-4 inline-flex rounded-full bg-white px-3 py-1 text-sm font-semibold text-ink shadow-sm">
        {statusLabel[order.status]}
      </p>
      <OrderTrack status={order.status} />

      <section className="mt-6 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(10,20,40,0.05)]">
        <h2 className="font-bold text-ink">{store?.name ?? order.storeId}</h2>
        <ul className="mt-4 divide-y divide-ink/10">
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

      <section className="mt-4 rounded-[28px] bg-white p-5 text-sm shadow-[0_8px_30px_rgba(10,20,40,0.05)]">
        <h2 className="font-bold text-ink">Livraison</h2>
        <p className="mt-2">
          {order.customer.firstName} {order.customer.lastName}
        </p>
        <p>{formatPhone(order.customer.phone)}</p>
        <p>
          {order.customer.address}, {order.customer.city}
        </p>
        {location ? (
          <div className="mt-3">
            <DeliveryMap center={location} value={location} interactive={false} />
            {mapsUrl ? (
              <a href={mapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-octopus">
                Voir la position
              </a>
            ) : null}
          </div>
        ) : null}
        {order.note ? <p className="mt-2 text-ink/70">Note : {order.note}</p> : null}
        <p className="mt-3 font-semibold">Paiement à la livraison</p>
      </section>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={reordering}
          onClick={() => void reorder()}
          className="press inline-flex h-12 items-center justify-center rounded-2xl bg-octopus px-5 font-semibold text-white disabled:opacity-60"
        >
          Commander à nouveau
        </button>
        <Link
          href="/"
          className="press inline-flex h-12 items-center justify-center rounded-2xl bg-ink px-5 font-semibold text-white"
        >
          Nouvelle commande
        </Link>
      </div>
    </main>
  );
}

function OrderTrack({ status }: { status: OrderStatus }) {
  if (status === "cancelled") {
    return (
      <p className="mt-4 rounded-2xl bg-coral/10 px-4 py-3 text-sm font-semibold text-coral">
        Commande annulée
      </p>
    );
  }

  const steps: OrderStatus[] = ["pending", "accepted", "preparing", "delivering", "delivered"];
  const current = Math.max(0, steps.indexOf(status));

  return (
    <ol className="mt-5 grid grid-cols-5 gap-2">
      {steps.map((step, index) => {
        const done = index <= current;
        return (
          <li key={step} className="text-center">
            <div className={`mx-auto h-2.5 w-2.5 rounded-full ${done ? "bg-octopus" : "bg-ink/15"}`} />
            <div className={`mt-2 h-1 rounded-full ${done ? "bg-octopus" : "bg-ink/10"}`} />
            <p className={`mt-1 text-[10px] font-semibold leading-tight ${done ? "text-ink" : "text-ink/40"}`}>
              {statusLabel[step]}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
