import type { Metadata } from "next";
import { CarteManager } from "@/components/admin/CarteManager";

export const metadata: Metadata = { title: "Carte" };

export default function CartePage() {
  return <CarteManager />;
}
