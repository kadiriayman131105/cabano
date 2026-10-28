import { customerPhone, orderWhatsAppText } from "@/lib/format";

export function CustomerReach({
  order,
}: {
  order: { id: string; customer: { firstName: string; phone: string; address: string; city: string } };
}) {
  const phone = customerPhone(order.customer.phone);
  return (
    <div className="flex gap-2">
      <a
        href={phone.tel}
        className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-ink px-4 text-sm font-semibold text-white"
      >
        Appeler
      </a>
      <a
        href={phone.whatsapp(orderWhatsAppText(order))}
        target="_blank"
        rel="noopener noreferrer"
        className="press inline-flex h-12 flex-1 items-center justify-center rounded-full bg-success px-4 text-sm font-semibold text-white"
      >
        WhatsApp
      </a>
    </div>
  );
}
