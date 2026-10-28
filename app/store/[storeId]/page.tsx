import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { StoreMenu } from "@/components/StoreMenu";
import { getMenu } from "@/lib/catalog";
import { getStore, stores } from "@/data/stores";

type StorePageProps = {
  params: Promise<{ storeId: string }>;
};

export function generateStaticParams() {
  return stores.map((store) => ({ storeId: store.id }));
}

export async function generateMetadata({ params }: StorePageProps): Promise<Metadata> {
  const { storeId } = await params;
  const store = getStore(storeId);
  return { title: store?.name ?? "Magasin" };
}

export default function StorePage({ params }: StorePageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-5xl px-4 py-8">
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
        </main>
      }
    >
      <StoreGate params={params} />
    </Suspense>
  );
}

async function StoreGate({ params }: StorePageProps) {
  await connection();
  const { storeId } = await params;
  const store = getStore(storeId);
  if (!store) notFound();

  return <StoreMenu store={store} sections={getMenu(store.id)} />;
}
