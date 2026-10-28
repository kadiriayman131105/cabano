import type { Store } from "@/types";

export const stores: Store[] = [
  {
    id: "casablanca",
    name: "Casablanca – El Hank",
    city: "Casablanca",
    area: "Corniche, El Hank",
    phone: "0643992572",
    deliveryFee: 25,
    hours: "12h–23h · fermé le vendredi",
    lat: 33.6047506,
    lng: -7.6516349,
  },
  {
    id: "bouskoura",
    name: "Bouskoura – Andalous Crystal",
    city: "Bouskoura",
    area: "Andalous Crystal",
    phone: "0780608081",
    deliveryFee: 20,
    hours: "12h–23h · fermé le vendredi",
    lat: 33.465302,
    lng: -7.646741,
  },
];

export function getStore(storeId: string) {
  return stores.find((store) => store.id === storeId);
}
