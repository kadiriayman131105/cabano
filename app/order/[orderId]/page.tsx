import type { Metadata } from "next";
import { Suspense } from "react";
import { OrderConfirmation } from "@/components/OrderConfirmation";

type OrderPageProps = {
  params: Promise<{ orderId: string }>;
};

export const metadata: Metadata = { title: "Confirmation" };

export default function OrderPage({ params }: OrderPageProps) {
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

async function OrderGate({ params }: OrderPageProps) {
  const { orderId } = await params;
  return <OrderConfirmation token={orderId} />;
}
