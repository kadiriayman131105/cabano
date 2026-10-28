import Link from "next/link";
import { OpenBadge } from "@/components/OpenBadge";
import { StoreCover } from "@/components/StoreCover";
import { formatPhone, formatPrice } from "@/lib/format";
import type { Store } from "@/types";

export function StoreCard({ store }: { store: Store }) {
  return (
    <Link
      href={`/store/${store.id}`}
      className="press block overflow-hidden rounded-[28px] bg-white shadow-[0_12px_40px_rgba(10,20,40,0.08)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-octopus"
    >
      <div className="relative">
        <StoreCover storeId={store.id} className="h-44 w-full" />
        <div className="absolute left-3 top-3">
          <OpenBadge />
        </div>
        <p className="absolute bottom-3 left-4 right-4 truncate text-sm font-semibold text-white">
          {store.area}
        </p>
      </div>
      <div className="p-4">
        <h2 className="text-xl font-bold tracking-tight text-ink">{store.name}</h2>
        <p className="mt-1 text-sm text-ink/60">{formatPhone(store.phone)}</p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="rounded-full bg-sea px-3 py-1 text-xs font-semibold text-ink">
            Livraison {formatPrice(store.deliveryFee)}
          </span>
          <span className="text-sm font-semibold text-octopus">Commander</span>
        </div>
        <p className="mt-3 text-xs font-medium text-ink/50">{store.hours}</p>
      </div>
    </Link>
  );
}
