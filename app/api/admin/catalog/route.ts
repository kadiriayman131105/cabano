import {
  createMenu,
  createSubmenu,
  deleteArticle,
  deleteMenu,
  deleteSubmenu,
  listCatalog,
  renameMenu,
  renameSubmenu,
  setArticleAvailable,
} from "@/lib/catalog";
import { requireAdmin } from "@/lib/session";

export async function GET(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const store = new URL(request.url).searchParams.get("store") ?? "";
  if (store !== "casablanca" && store !== "bouskoura") {
    return Response.json({ error: "Magasin inconnu." }, { status: 400 });
  }
  return Response.json({ menus: listCatalog(store) });
}

export async function POST(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    storeId?: string;
    menuId?: string;
    name?: string;
  } | null;
  if (!body) return Response.json({ error: "Demande illisible." }, { status: 400 });

  if (body.kind === "menu") {
    const created = createMenu(body.storeId ?? "", body.name ?? "");
    if ("error" in created) return Response.json({ error: created.error }, { status: 400 });
    return Response.json(created);
  }
  if (body.kind === "submenu") {
    const created = createSubmenu(body.menuId ?? "", body.name ?? "");
    if ("error" in created) return Response.json({ error: created.error }, { status: 400 });
    return Response.json(created);
  }
  return Response.json({ error: "Type inconnu." }, { status: 400 });
}

export async function PATCH(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const body = (await request.json().catch(() => null)) as {
    kind?: string;
    id?: string;
    name?: string;
    available?: boolean;
  } | null;
  if (!body?.id) return Response.json({ error: "Élément introuvable." }, { status: 400 });
  if (body.kind === "article") {
    if (typeof body.available !== "boolean") {
      return Response.json({ error: "État du plat illisible." }, { status: 400 });
    }
    const updated = setArticleAvailable(body.id, body.available);
    if ("error" in updated) return Response.json({ error: updated.error }, { status: 404 });
    return Response.json({ ok: true });
  }
  const renamed =
    body.kind === "menu"
      ? renameMenu(body.id, body.name ?? "")
      : body.kind === "submenu"
        ? renameSubmenu(body.id, body.name ?? "")
        : { error: "Type inconnu." as const };
  if ("error" in renamed) return Response.json({ error: renamed.error }, { status: 400 });
  return Response.json({ ok: true });
}

export async function DELETE(request: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  const id = params.get("id") ?? "";
  const removed =
    kind === "menu"
      ? deleteMenu(id)
      : kind === "submenu"
        ? deleteSubmenu(id)
        : kind === "article"
          ? deleteArticle(id)
          : { error: "Type inconnu." as const };
  if ("error" in removed) return Response.json({ error: removed.error }, { status: 404 });
  return Response.json({ ok: true });
}
