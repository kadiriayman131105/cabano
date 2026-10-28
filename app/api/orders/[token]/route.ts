import { getOrderByToken } from "@/lib/orderRecords";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params;
  const order = getOrderByToken(token);
  if (!order) return Response.json({ error: "Commande introuvable." }, { status: 404 });
  return Response.json(order);
}
