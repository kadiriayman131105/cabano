import { distinctLineError, MAX_DISTINCT_LINES, MAX_LINE_COMMENT, MAX_LINE_QTY, MAX_OPTION_QTY, MAX_OPTIONS } from "@/lib/limits";
import { quoteCart } from "@/lib/orderRecords";
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
});

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ error: "Demande illisible." }, { status: 400 });
  }

  const tooMany = distinctLineError(json);
  if (tooMany) return Response.json({ error: tooMany }, { status: 400 });

  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "Panier invalide." }, { status: 400 });
  }

  const quoted = quoteCart(parsed.data.storeId, parsed.data.items);
  if ("error" in quoted) {
    return Response.json({ error: quoted.error }, { status: 400 });
  }
  return Response.json(quoted);
}
