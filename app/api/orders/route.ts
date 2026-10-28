import { getStore } from "@/data/stores";
import { CLOSED_MESSAGE, isOpenNow } from "@/lib/hours";
import { distinctLineError, MAX_DISTINCT_LINES, MAX_LINE_COMMENT, MAX_LINE_QTY, MAX_OPTION_QTY, MAX_OPTIONS } from "@/lib/limits";
import { takeSlot } from "@/lib/loginLimit";
import { createOrder } from "@/lib/orderRecords";
import { z } from "zod";

const bodySchema = z.object({
  storeId: z.string(),
  items: z
    .array(
      z.object({
        productId: z.string(),
        qty: z.number().int().min(1).max(MAX_LINE_QTY),
        comment: z.string().trim().max(MAX_LINE_COMMENT).optional(),
        spicy: z.boolean().optional(),
        options: z
          .array(
            z.object({
              id: z.string().min(1).max(40),
              qty: z.number().int().min(0).max(MAX_OPTION_QTY),
            }),
          )
          .max(MAX_OPTIONS)
          .optional(),
      }),
    )
    .min(1)
    .max(MAX_DISTINCT_LINES),
  note: z.string().trim().max(300).optional(),
  expectedTotal: z.number().int().nonnegative().max(2_000_000_000).optional(),
  customer: z.object({
    firstName: z.string().trim().min(2).max(80),
    lastName: z.string().trim().min(2).max(80),
    phone: z.string().trim(),
    city: z.string().trim().min(2).max(80),
    address: z.string().trim().min(5).max(300),
    location: z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
      })
      .optional(),
  }),
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Commande illisible." }, { status: 400 });
  }

  const tooMany = distinctLineError(json);
  if (tooMany) return Response.json({ error: tooMany }, { status: 400 });

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Vérifiez les informations de livraison." }, { status: 400 });
  }

  const phone = parsed.data.customer.phone.replace(/\s/g, "");
  if (!/^0[67]\d{8}$/.test(phone)) {
    return Response.json({ error: "Numéro invalide. Exemple : 0612345678" }, { status: 400 });
  }

  if (!getStore(parsed.data.storeId)) {
    return Response.json({ error: "Magasin inconnu." }, { status: 400 });
  }

  if (!isOpenNow()) {
    return Response.json({ error: CLOSED_MESSAGE }, { status: 403 });
  }

  const phoneKey = `order:${phone}`;
  if (
    !takeSlot(phoneKey, 4, 15 * 60 * 1000) ||
    !takeSlot("order:global", 30, 60 * 1000)
  ) {
    return Response.json(
      { error: "Trop de commandes pour le moment. Réessayez dans quelques minutes." },
      { status: 429 },
    );
  }

  const created = createOrder({
    storeId: parsed.data.storeId,
    lines: parsed.data.items,
    note: parsed.data.note,
    expectedTotal: parsed.data.expectedTotal,
    customer: {
      ...parsed.data.customer,
      phone,
    },
  });

  if ("error" in created) {
    return Response.json(
      {
        error: created.error,
        quote: "quote" in created ? created.quote : undefined,
      },
      { status: "conflict" in created ? 409 : 400 },
    );
  }

  return Response.json({ id: created.order.id, token: created.token });
}
