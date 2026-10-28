import { StoreCard } from "@/components/StoreCard";
import { stores } from "@/data/stores";

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-8 pt-6 sm:pt-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-octopus">Livraison</p>
      <h1 className="mt-2 max-w-xl text-3xl font-bold tracking-tight text-ink sm:text-5xl">
        Qu’est-ce qu’on commande ?
      </h1>
      <p className="mt-3 max-w-md text-base leading-relaxed text-ink/65">
        Poulpe, pélou, pizzas et m9ila. Deux adresses, paiement en espèces à la livraison.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {stores.map((store) => (
          <StoreCard key={store.id} store={store} />
        ))}
      </div>
    </main>
  );
}
