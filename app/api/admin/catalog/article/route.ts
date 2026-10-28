import { createArticle, saveArticleImage, updateArticle, type OptionDraft } from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

function readOptions(form: FormData): { options: OptionDraft[] } | { error: string } {
  const raw = form.get("options");
  if (typeof raw !== "string" || raw.trim() === "") return { options: [] };
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return { error: "Composants illisibles." };
    const options = parsed.map((item) => {
      const row = item as { id?: unknown; name?: unknown; included?: unknown; extraPrice?: unknown };
      return {
        id: typeof row.id === "string" ? row.id : undefined,
        name: String(row.name ?? ""),
        included: row.included === true,
        extraPrice: Number(row.extraPrice),
      };
    });
    return { options };
  } catch {
    return { error: "Composants illisibles." };
  }
}

async function readImage(form: FormData) {
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { image: null as string | null };
  return saveArticleImage(file);
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Demande illisible." }, { status: 400 });
  const image = await readImage(form);
  if ("error" in image) return Response.json({ error: image.error }, { status: 400 });
  const options = readOptions(form);
  if ("error" in options) return Response.json({ error: options.error }, { status: 400 });
  const created = createArticle({
    storeId: String(form.get("storeId") ?? ""),
    submenuId: String(form.get("submenuId") ?? ""),
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    price: Number(form.get("price")),
    image: image.image,
    options: options.options,
  });
  if ("error" in created) return Response.json({ error: created.error }, { status: 400 });
  return Response.json(created);
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ error: "Demande illisible." }, { status: 400 });
  const file = form.get("image");
  const hasFile = file instanceof File && file.size > 0;
  const removeImage = form.get("removeImage") === "1";
  const image = hasFile ? await readImage(form) : { image: null as string | null };
  if ("error" in image) return Response.json({ error: image.error }, { status: 400 });
  const options = readOptions(form);
  if ("error" in options) return Response.json({ error: options.error }, { status: 400 });
  const saved = updateArticle({
    id: String(form.get("id") ?? ""),
    submenuId: String(form.get("submenuId") ?? ""),
    name: String(form.get("name") ?? ""),
    description: String(form.get("description") ?? ""),
    price: Number(form.get("price")),
    image: image.image,
    replaceImage: hasFile || removeImage,
    options: options.options,
  });
  if ("error" in saved) return Response.json({ error: saved.error }, { status: 400 });
  return Response.json({ ok: true });
}
