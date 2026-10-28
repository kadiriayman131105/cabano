import type { Metadata } from "next";
import { CheckoutView } from "@/components/CheckoutView";

export const metadata: Metadata = { title: "Commande" };

export default function CheckoutPage() {
  return <CheckoutView />;
}
