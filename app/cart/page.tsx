import type { Metadata } from "next";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Panier" };

export default function CartPage() {
  return <CartView />;
}
