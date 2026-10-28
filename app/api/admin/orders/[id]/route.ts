import { canChangeStatus } from "@/lib/format";
import { getOrderById, isOrderStatus, updateOrderStatus } from "@/lib/orderRecords";
import { requireAdmin } from "@/lib/session";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  const order = getOrderById(id);
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  return Response.json(order);
}

export async function PATCH(request: Request, context: RouteContext) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await context.params;
  let status = "";
  try {
    const body = (await request.json()) as { status?: string };
    status = body.status ?? "";
  } catch {
    status = "";
  }
  if (!isOrderStatus(status)) {
    return Response.json({ error: "Statut invalide." }, { status: 400 });
  }
  const current = getOrderById(id);
  if (!current) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  if (!canChangeStatus(current.status, status)) {
    return Response.json({ error: "Ce changement de statut n'est pas possible." }, { status: 400 });
  }
  if (!updateOrderStatus(id, status)) {
    return Response.json({ error: "Statut non enregistré." }, { status: 409 });
  }
  const updated = getOrderById(id);
  if (!updated) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  return Response.json(updated);
}
