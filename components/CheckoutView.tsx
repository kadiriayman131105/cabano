"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { CartSummary } from "@/components/CartSummary";
import { confirmAction } from "@/components/ConfirmDialog";
import { DeliveryMap } from "@/components/DeliveryMap";
import { getStore } from "@/data/stores";
import { cartSignature, subtotalOf } from "@/lib/cartMath";
import { formatPrice } from "@/lib/format";
import { CLOSED_MESSAGE, isOpenNow } from "@/lib/hours";
import { MAX_DISTINCT_LINES, MAX_DISTINCT_MESSAGE, MAX_LINE_QTY } from "@/lib/limits";
import { notifyError, notifySaved } from "@/lib/notify";
import { useStoreOpen } from "@/lib/useStoreOpen";
import { useCartReady } from "@/lib/useCartReady";
import { useCartStore } from "@/store/cartStore";
import type { Store } from "@/types";

const schema = z.object({
  firstName: z.string().trim().min(2, "Indiquez votre prénom"),
  lastName: z.string().trim().min(2, "Indiquez votre nom"),
  phone: z
    .string()
    .trim()
    .refine((value) => /^0[67]\d{8}$/.test(value.replace(/\s/g, "")), {
      message: "Numéro invalide. Exemple : 0612345678",
    }),
  city: z.string().trim().min(2, "Indiquez la ville"),
  address: z.string().trim().min(5, "Indiquez l'adresse de livraison"),
  note: z.string().trim().max(300, "300 caractères maximum"),
});

type FormValues = z.infer<typeof schema>;

const orderGate = { locked: false };

export function CheckoutView() {
  const ready = useCartReady();
  const items = useCartStore((state) => state.items);
  const storeId = useCartStore((state) => state.storeId);
  const clear = useCartStore((state) => state.clear);
  const store = storeId ? getStore(storeId) : undefined;
  const [placed, setPlaced] = useState<string | null>(null);

  if (!ready) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-8">
        <div className="h-64 animate-pulse rounded-3xl bg-white" />
      </main>
    );
  }

  if (placed) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-ink">Commande enregistrée</h1>
        <p className="mt-2 text-ink/70">Vous pouvez suivre la commande même si la page tarde.</p>
        <Link
          href={placed}
          className="mt-6 inline-flex h-11 items-center rounded-full bg-octopus px-5 font-semibold text-white"
        >
          Voir la commande
        </Link>
      </main>
    );
  }

  if (!store || items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-16 text-center">
        <h1 className="text-3xl font-bold text-ink">Votre panier est vide</h1>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center rounded-full bg-octopus px-5 font-semibold text-white"
        >
          Voir les magasins
        </Link>
      </main>
    );
  }

  return (
    <CheckoutForm
      store={store}
      onPlaced={(token) => {
        setPlaced(`/order/${token}`);
        clear();
      }}
    />
  );
}

function CheckoutForm({
  store,
  onPlaced,
}: {
  store: Store;
  onPlaced: (token: string) => void;
}) {
  const router = useRouter();
  const items = useCartStore((state) => state.items);
  const priceCheck = useCartStore((state) => state.priceCheck);
  const open = useStoreOpen();
  const closed = open === false;
  const signature = cartSignature(store.id, items);
  const priced = priceCheck === signature;
  const [busy, setBusy] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => {
    useCartStore.getState().recheckPrices();
    return () => {
      orderGate.locked = false;
    };
  }, []);

  const {
    register,
    trigger,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      city: store.city,
      address: "",
      note: "",
    },
  });

  if (items.length === 0) return null;

  const subtotal = subtotalOf(items);
  const total = subtotal + store.deliveryFee;

  function locate() {
    if (!navigator.geolocation) {
      setGeoError("La localisation n'est pas disponible sur cet appareil.");
      return;
    }
    setGeoLoading(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setGeoLoading(false);
      },
      () => {
        setGeoError("Position indisponible. Vous pouvez commander sans localisation.");
        setGeoLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (orderGate.locked || !priced) return;
    if (items.length > MAX_DISTINCT_LINES) {
      notifyError(MAX_DISTINCT_MESSAGE);
      return;
    }
    if (!isOpenNow()) {
      notifyError(CLOSED_MESSAGE);
      return;
    }
    orderGate.locked = true;
    setBusy(true);
    const valid = await trigger();
    if (!valid) {
      orderGate.locked = false;
      setBusy(false);
      return;
    }
    const values = getValues();
    const ok = await confirmAction({
      title: "Envoyer la commande ?",
      message: `Total ${formatPrice(total)}`,
      confirmLabel: "Envoyer",
    });
    if (!ok) {
      orderGate.locked = false;
      setBusy(false);
      return;
    }
    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: store.id,
          items: items.map((item) => ({
            productId: item.productId,
            qty: Math.min(MAX_LINE_QTY, Math.max(1, Math.floor(item.qty))),
            ...(item.comment?.trim() ? { comment: item.comment.trim() } : {}),
            spicy: item.spicy === true,
            ...(item.options && item.options.length > 0
              ? { options: item.options.map((option) => ({ id: option.id, qty: option.qty })) }
              : {}),
          })),
          note: values.note,
          expectedTotal: total,
          customer: {
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone.replace(/\s/g, ""),
            city: values.city,
            address: values.address,
            location: location ?? undefined,
          },
        }),
      });
      const body = (await response.json().catch(() => null)) as {
        token?: string;
        error?: string;
        quote?: {
          items: {
            productId: string;
            name: string;
            unitPrice: number;
            image: string | null;
            options?: { id: string; name: string; qty: number; included: number }[];
            spicy: boolean;
            spicyChoice: boolean;
          }[];
        };
      } | null;
      if (!response.ok || !body?.token) {
        if (response.status === 409 && body?.quote?.items) {
          useCartStore.getState().syncQuoted(body.quote.items);
        } else {
          useCartStore.getState().recheckPrices();
        }
        throw new Error(body?.error || "Impossible d'enregistrer la commande.");
      }
      onPlaced(body.token);
      notifySaved("Commande enregistrée.");
      router.push(`/order/${body.token}`);
    } catch (error) {
      orderGate.locked = false;
      setBusy(false);
      notifyError(error instanceof Error ? error.message : "Impossible d'enregistrer la commande.");
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 pb-28 lg:pb-8">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-octopus">Livraison</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-ink">Vos informations</h1>
      <p className="mt-1 text-sm text-ink/60">Depuis {store.name}</p>
      <form onSubmit={onSubmit} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 rounded-[28px] bg-white p-5 shadow-[0_8px_30px_rgba(10,20,40,0.05)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Prénom" error={errors.firstName?.message}>
              <input
                {...register("firstName")}
                autoComplete="given-name"
                className={inputClass(Boolean(errors.firstName))}
              />
            </Field>
            <Field label="Nom" error={errors.lastName?.message}>
              <input
                {...register("lastName")}
                autoComplete="family-name"
                className={inputClass(Boolean(errors.lastName))}
              />
            </Field>
          </div>
          <Field label="Téléphone" error={errors.phone?.message}>
            <input
              {...register("phone")}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="0612345678"
              className={inputClass(Boolean(errors.phone))}
            />
          </Field>
          <Field label="Ville" error={errors.city?.message}>
            <input
              {...register("city")}
              autoComplete="address-level2"
              className={inputClass(Boolean(errors.city))}
            />
          </Field>
          <Field label="Adresse" error={errors.address?.message}>
            <textarea
              {...register("address")}
              rows={3}
              autoComplete="street-address"
              className={inputClass(Boolean(errors.address))}
            />
          </Field>
          <div>
            <p className="text-sm font-semibold text-ink">Localisation</p>
            <p className="mt-1 text-sm text-ink/70">
              Touchez la carte pour placer le point de livraison. L’adresse écrite reste nécessaire.
            </p>
            <div className="mt-3">
              <DeliveryMap
                key={store.id}
                center={{ lat: store.lat, lng: store.lng }}
                value={location}
                onChange={setLocation}
              />
            </div>
            <button
              type="button"
              onClick={locate}
              disabled={geoLoading}
              className="mt-3 h-11 rounded-full border border-octopus px-4 text-sm font-semibold text-octopus disabled:opacity-60"
            >
              {geoLoading ? "Recherche…" : "Utiliser ma position"}
            </button>
            {location ? <p className="mt-2 text-sm text-success">Point placé sur la carte</p> : null}
            {geoError ? <p className="mt-2 text-sm text-coral">{geoError}</p> : null}
          </div>
          <Field label="Note" error={errors.note?.message}>
            <textarea
              {...register("note")}
              rows={2}
              placeholder="Étage, code, sonnette…"
              className={inputClass(Boolean(errors.note))}
            />
          </Field>
          <div className="rounded-2xl bg-sea px-4 py-3">
            <p className="font-semibold text-ink">Paiement à la livraison</p>
            <p className="text-sm text-ink/65">Vous payez le livreur en espèces.</p>
          </div>
        </div>
        <div className="h-fit space-y-4 lg:sticky lg:top-24">
          <CartSummary subtotal={subtotal} deliveryFee={store.deliveryFee} total={total} />
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:bg-transparent lg:p-0">
            {closed ? <p className="mb-2 text-center text-sm font-semibold text-coral">{CLOSED_MESSAGE}</p> : null}
            {!closed && !priced ? (
              <p className="mb-2 text-center text-sm font-semibold text-ink/60">Vérification des prix…</p>
            ) : null}
            <button
              type="submit"
              disabled={busy || closed || !priced}
              className="press flex h-12 w-full items-center justify-between rounded-full bg-ink px-5 font-semibold text-white disabled:opacity-60"
            >
              <span>{closed ? "Magasin fermé" : "Valider la commande"}</span>
              <span>{formatPrice(total)}</span>
            </button>
          </div>
        </div>
      </form>
    </main>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-ink">{label}</span>
      <div className="mt-1">{children}</div>
      {error ? <span className="mt-1 block text-sm text-coral">{error}</span> : null}
    </label>
  );
}

function inputClass(invalid: boolean) {
  return `w-full rounded-2xl border bg-white px-4 py-3 outline-none focus:border-octopus ${
    invalid ? "border-coral" : "border-ink/15"
  }`;
}
