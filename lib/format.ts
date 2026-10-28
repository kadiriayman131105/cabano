import type { OrderStatus } from "@/types";

export function itemSpice(spicy: boolean | undefined) {
  if (spicy === true) return "Épicé";
  if (spicy === false) return "Non épicé";
  return null;
}

export function formatPrice(amount: number) {
  return `${new Intl.NumberFormat("fr-MA").format(amount)} DH`;
}

export function formatPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits.replace(/(\d{2})(?=\d)/g, "$1 ").trim();
}

export function customerPhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  const local = digits.startsWith("212") ? digits.slice(3) : digits.replace(/^0/, "");
  const intl = `212${local}`;
  return {
    tel: `tel:+${intl}`,
    whatsapp(text: string) {
      return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
    },
  };
}

export function orderWhatsAppText(order: {
  id: string;
  customer: { firstName: string; address: string; city: string };
}) {
  return `Bonjour ${order.customer.firstName}, c’est Cabano.\nCommande ${order.id}.\n${order.customer.address}, ${order.customer.city}.`;
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("fr-MA", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: "Africa/Casablanca",
  }).format(new Date(iso));
}

export const statusLabel: Record<OrderStatus, string> = {
  pending: "En attente",
  accepted: "Acceptée",
  preparing: "En préparation",
  delivering: "En livraison",
  delivered: "Livrée",
  cancelled: "Annulée",
};

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: "accepted",
  accepted: "preparing",
  preparing: "delivering",
  delivering: "delivered",
};

export function statusOptions(from: OrderStatus): OrderStatus[] {
  const options: OrderStatus[] = [from];
  const next = nextStatus[from];
  if (next) options.push(next);
  if (from !== "delivered" && from !== "cancelled") options.push("cancelled");
  return options;
}

export function canChangeStatus(from: OrderStatus, to: OrderStatus) {
  return from !== to && statusOptions(from).includes(to);
}
