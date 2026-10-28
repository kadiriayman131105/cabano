import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderDetail } from "@/components/admin/OrderDetail";

export const metadata: Metadata = { title: "Commande" };

type PageProps = { params: Promise<{ id: string }> };

export default function AdminOrderPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl px-4 py-8">
          <div className="h-64 animate-pulse rounded-3xl bg-white" />
        </main>
      }
    >
      <OrderGate params={params} />
    </Suspense>
  );
}

async function OrderGate({ params }: PageProps) {
  const { id } = await params;
  return <OrderDetail id={id} />;
}
