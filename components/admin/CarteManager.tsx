"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { BottomSheet } from "@/components/BottomSheet";
import { confirmAction } from "@/components/ConfirmDialog";
import { PhotoPlaceholder } from "@/components/PhotoPlaceholder";
import { formatPrice } from "@/lib/format";
import { MAX_EXTRA_PRICE, MAX_OPTIONS } from "@/lib/limits";
import { notifySaved } from "@/lib/notify";
import type { CatalogArticle, CatalogMenu, CatalogSubmenu } from "@/lib/catalog";

type OptionDraft = {
  key: string;
  id?: string;
  name: string;
  included: boolean;
  extraPrice: string;
};

const shops = [
  { id: "casablanca", label: "Casablanca" },
  { id: "bouskoura", label: "Bouskoura" },
] as const;

type ShopId = (typeof shops)[number]["id"];

const fieldClass =
  "mt-1 w-full rounded-2xl border border-ink/15 bg-white px-4 py-3 text-base outline-none focus:border-octopus";

export function CarteManager() {
  const router = useRouter();
  const [shop, setShop] = useState<ShopId>("casablanca");
  const [menus, setMenus] = useState<CatalogMenu[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load(nextShop = shop) {
    const response = await fetch(`/api/admin/catalog?store=${nextShop}`);
    if (response.status === 401) {
      router.push("/admin/login");
      router.refresh();
      return;
    }
    const body = (await response.json().catch(() => null)) as { menus?: CatalogMenu[]; error?: string } | null;
    if (!response.ok || !body?.menus) {
      setError(body?.error ?? "Impossible de charger la carte.");
      setLoading(false);
      return;
    }
    setMenus(body.menus);
    setError("");
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    async function first() {
      const response = await fetch(`/api/admin/catalog?store=${shop}`);
      if (cancelled) return;
      if (response.status === 401) {
        router.push("/admin/login");
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => null)) as { menus?: CatalogMenu[]; error?: string } | null;
      if (!response.ok || !body?.menus) {
        setError(body?.error ?? "Impossible de charger la carte.");
      } else {
        setMenus(body.menus);
        setError("");
      }
      setLoading(false);
    }
    void first();
    return () => {
      cancelled = true;
    };
  }, [router, shop]);

  async function send(input: RequestInfo, init: RequestInit) {
    const response = await fetch(input, init);
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.status === 401) {
      router.push("/admin/login");
      router.refresh();
      return false;
    }
    if (!response.ok) {
      setError(body?.error ?? "Enregistrement impossible.");
      return false;
    }
    setError("");
    const method = init.method ?? "GET";
    if (method === "POST") notifySaved("Créé.");
    if (method === "PATCH") notifySaved("Enregistré.");
    if (method === "DELETE") notifySaved("Supprimé.");
    await load();
    return true;
  }

  async function addNamed(kind: "menu" | "submenu", name: string, menuId?: string) {
    const ok = await confirmAction({
      title: kind === "menu" ? "Ajouter ce menu ?" : "Ajouter ce sous-menu ?",
      message: name.trim(),
      confirmLabel: "Ajouter",
    });
    if (!ok) return false;
    return send("/api/admin/catalog", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, name, storeId: shop, menuId }),
    });
  }

  async function rename(kind: "menu" | "submenu", id: string, name: string) {
    const ok = await confirmAction({
      title: kind === "menu" ? "Enregistrer ce menu ?" : "Enregistrer ce sous-menu ?",
      message: name.trim(),
      confirmLabel: "Enregistrer",
    });
    if (!ok) return false;
    return send("/api/admin/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, id, name }),
    });
  }

  async function remove(kind: "menu" | "submenu" | "article", id: string, name: string) {
    const title =
      kind === "menu" ? "Supprimer ce menu ?" : kind === "submenu" ? "Supprimer ce sous-menu ?" : "Supprimer cet article ?";
    const detail =
      kind === "menu"
        ? "Les sous-menus et articles de ce menu seront aussi supprimés."
        : kind === "submenu"
          ? "Les articles de ce sous-menu seront aussi supprimés."
          : "";
    const ok = await confirmAction({
      title,
      message: detail ? `${name}. ${detail}` : name,
      confirmLabel: "Supprimer",
      danger: true,
    });
    if (!ok) return;
    await send(`/api/admin/catalog?kind=${kind}&id=${encodeURIComponent(id)}`, { method: "DELETE" });
  }

  async function setAvailable(id: string, available: boolean) {
    const response = await fetch("/api/admin/catalog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind: "article", id, available }),
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    if (response.status === 401) {
      router.push("/admin/login");
      router.refresh();
      return;
    }
    if (!response.ok) {
      setError(body?.error ?? "Enregistrement impossible.");
      return;
    }
    setError("");
    notifySaved(available ? "En stock." : "Out of stock.");
    await load();
  }

  const submenus = menus.flatMap((menu) => menu.submenus.map((submenu) => ({ ...submenu, menuName: menu.name })));

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">Carte</h1>
      <p className="mt-1 text-sm text-ink/70">Menus, sous-menus et articles de chaque magasin.</p>
      <div className="mt-4 flex gap-2">
        {shops.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => {
              setLoading(true);
              setShop(option.id);
            }}
            className={`h-10 rounded-full px-4 text-sm font-semibold ${
              shop === option.id ? "bg-ink text-white" : "bg-white text-ink"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {error ? <p className="mt-4 text-sm font-medium text-coral">{error}</p> : null}
      {loading ? <div className="mt-6 h-40 animate-pulse rounded-3xl bg-white" /> : null}

      <div className="mt-6 space-y-4">
        {menus.map((menu) => (
          <section key={menu.id} className="rounded-3xl bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-ink">{menu.name}</h2>
              <DeleteButton onClick={() => remove("menu", menu.id, menu.name)} />
            </div>
            <NameForm
              collapsedLabel="Renommer"
              label="Nouveau nom du menu"
              initial={menu.name}
              submitLabel="Enregistrer"
              onSubmit={(name) => rename("menu", menu.id, name)}
            />
            <div className="mt-4 space-y-4">
              {menu.submenus.map((submenu) => (
                <SubmenuBlock
                  key={submenu.id}
                  shop={shop}
                  submenu={submenu}
                  showTitle={
                    menu.submenus.length > 1 ||
                    submenu.name.trim().toLocaleLowerCase("fr") !== menu.name.trim().toLocaleLowerCase("fr")
                  }
                  submenus={submenus}
                  onRename={(name) => rename("submenu", submenu.id, name)}
                  onDelete={() => remove("submenu", submenu.id, submenu.name)}
                  onDeleteArticle={(article) => remove("article", article.id, article.name)}
                  onAvailability={(id, available) => setAvailable(id, available)}
                  onSaved={load}
                  onError={setError}
                />
              ))}
            </div>
            <NameForm
              collapsedLabel="Nouveau sous-menu"
              label="Nom du sous-menu"
              placeholder="Nom du sous-menu"
              submitLabel="Ajouter"
              onSubmit={(name) => addNamed("submenu", name, menu.id)}
            />
          </section>
        ))}
      </div>

      <section className="mt-4 rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="font-bold text-ink">Nouveau menu</h2>
        <NameForm
          label="Nom du menu"
          placeholder="Exemple : Pizzas"
          submitLabel="Ajouter le menu"
          onSubmit={(name) => addNamed("menu", name)}
        />
      </section>
    </main>
  );
}

function DeleteButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="shrink-0 rounded-full px-3 py-2 text-sm font-semibold text-coral">
      Supprimer
    </button>
  );
}

function NameForm({
  label,
  collapsedLabel,
  initial = "",
  placeholder,
  submitLabel,
  onSubmit,
}: {
  label: string;
  collapsedLabel?: string;
  initial?: string;
  placeholder?: string;
  submitLabel: string;
  onSubmit: (name: string) => Promise<boolean | void>;
}) {
  const [open, setOpen] = useState(!collapsedLabel);
  const [name, setName] = useState(initial);
  const [source, setSource] = useState(initial);
  const [busy, setBusy] = useState(false);
  if (source !== initial) {
    setSource(initial);
    setName(initial);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-3 rounded-full px-3 py-2 text-sm font-semibold text-octopus"
      >
        {collapsedLabel}
      </button>
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const ok = await onSubmit(name);
    if (ok && !initial) setName("");
    if (ok && collapsedLabel) setOpen(false);
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-3">
      <label className="block text-sm font-semibold text-ink">
        {label}
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      </label>
      <button
        type="submit"
        disabled={busy || name.trim().length < 2}
        className="press mt-3 h-11 rounded-full bg-ink px-4 text-sm font-semibold text-white disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </form>
  );
}

function SubmenuBlock({
  shop,
  submenu,
  showTitle,
  submenus,
  onRename,
  onDelete,
  onDeleteArticle,
  onAvailability,
  onSaved,
  onError,
}: {
  shop: ShopId;
  submenu: CatalogSubmenu;
  showTitle: boolean;
  submenus: Array<CatalogSubmenu & { menuName: string }>;
  onRename: (name: string) => Promise<boolean | void>;
  onDelete: () => void;
  onDeleteArticle: (article: CatalogArticle) => void;
  onAvailability: (id: string, available: boolean) => Promise<void>;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [editing, setEditing] = useState<CatalogArticle | null | "new">(null);

  return (
    <div className="rounded-2xl bg-sea/60 p-3">
      <div className="flex items-start justify-between gap-3">
        {showTitle ? (
          <h3 className="font-semibold text-ink">{submenu.name}</h3>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink/45">Sous-menu</p>
        )}
        <DeleteButton onClick={onDelete} />
      </div>
      <NameForm
        collapsedLabel="Renommer"
        label="Nouveau nom du sous-menu"
        initial={submenu.name}
        submitLabel="Enregistrer"
        onSubmit={onRename}
      />
      <ul className="mt-3 space-y-2">
        {submenu.articles.map((article) => (
          <li key={article.id} className="rounded-2xl bg-white p-3">
            <div className="flex items-start gap-3">
              {article.image ? (
                <Image
                  src={article.image}
                  alt=""
                  width={64}
                  height={64}
                  unoptimized
                  className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                />
              ) : (
                <PhotoPlaceholder className="h-14 w-14 shrink-0 rounded-xl sm:h-16 sm:w-16" />
              )}
              <div className="min-w-0 flex-1">
                <p className="break-words font-semibold text-ink">{article.name}</p>
                <p className="text-sm text-coral">{formatPrice(article.price)}</p>
                <p className="text-xs leading-relaxed text-ink/50">
                  {article.options.length > 0
                    ? article.options.map((option) => option.name).join(" · ")
                    : "Sans composition"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setEditing(article)}
                    className="rounded-full px-3 py-2 text-sm font-semibold text-octopus"
                  >
                    Modifier
                  </button>
                  <DeleteButton onClick={() => onDeleteArticle(article)} />
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={article.available}
              onClick={() => onAvailability(article.id, !article.available)}
              className={`press mt-3 h-12 w-full rounded-full text-sm font-semibold text-white ${
                article.available ? "bg-success" : "bg-red-600"
              }`}
            >
              {article.available ? "En stock" : "Out of stock"}
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="press mt-3 h-11 rounded-full bg-octopus px-4 text-sm font-semibold text-white"
      >
        Nouvel article
      </button>
      <BottomSheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        labelledBy="article-form-title"
        z="z-[70]"
      >
        {editing ? (
          <ArticleForm
            key={editing === "new" ? "new" : editing.id}
            shop={shop}
            submenuId={submenu.id}
            article={editing === "new" ? null : editing}
            submenus={submenus}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await onSaved();
            }}
            onError={onError}
          />
        ) : null}
      </BottomSheet>
    </div>
  );
}

function ArticleForm({
  shop,
  submenuId,
  article,
  submenus,
  onClose,
  onSaved,
  onError,
}: {
  shop: ShopId;
  submenuId: string;
  article: CatalogArticle | null;
  submenus: Array<CatalogSubmenu & { menuName: string }>;
  onClose: () => void;
  onSaved: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [name, setName] = useState(article?.name ?? "");
  const [description, setDescription] = useState(article?.description ?? "");
  const [price, setPrice] = useState(article ? String(article.price) : "");
  const [target, setTarget] = useState(submenuId);
  const [removeImage, setRemoveImage] = useState(false);
  const [compose, setCompose] = useState((article?.options.length ?? 0) > 0);
  const [parts, setParts] = useState<OptionDraft[]>(() =>
    (article?.options ?? []).map((option) => ({
      key: option.id,
      id: option.id,
      name: option.name,
      included: option.included,
      extraPrice: String(option.extraPrice),
    })),
  );
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const partsReady = parts.every((part) => {
    const name = part.name.trim();
    if (name.length === 0) return true;
    const extra = Number(part.extraPrice);
    return name.length >= 2 && name.length <= 40 && Number.isInteger(extra) && extra >= 0 && extra <= MAX_EXTRA_PRICE;
  });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const dropping = Boolean(article && article.options.length > 0 && !compose);
    const ok = await confirmAction({
      title: article ? "Enregistrer cet article ?" : "Créer cet article ?",
      message: dropping ? `${name.trim()}. La composition sera retirée de la carte.` : name.trim(),
      confirmLabel: article ? "Enregistrer" : "Créer",
    });
    if (!ok) return;
    setBusy(true);
    setFormError("");
    const form = new FormData(formElement);
    form.set("name", name);
    form.set("description", description);
    form.set("price", price);
    form.set("submenuId", target);
    if (article) form.set("id", article.id);
    if (removeImage) form.set("removeImage", "1");
    form.set(
      "options",
      JSON.stringify(
        compose
          ? parts
              .filter((part) => part.name.trim().length > 0)
              .map((part) => ({
                id: part.id,
                name: part.name,
                included: part.included,
                extraPrice: Number(part.extraPrice || 0),
              }))
          : [],
      ),
    );
    const response = await fetch("/api/admin/catalog/article", {
      method: article ? "PATCH" : "POST",
      body: form,
    });
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setBusy(false);
    if (!response.ok) {
      const message = body?.error ?? "Enregistrement impossible.";
      setFormError(message);
      onError(message);
      return;
    }
    onError("");
    notifySaved(article ? "Article enregistré." : "Article créé.");
    await onSaved();
  }

  return (
    <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
      <h2 id="article-form-title" className="text-lg font-bold text-ink">
        {article ? "Modifier l’article" : "Nouvel article"}
      </h2>
      <label className="mt-3 block text-sm font-semibold text-ink">
        Nom
        <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} />
      </label>
      <label className="mt-3 block text-sm font-semibold text-ink">
        Description
        <textarea
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          rows={2}
          className={fieldClass}
        />
      </label>
      <label className="mt-3 block text-sm font-semibold text-ink">
        Prix en DH
        <input
          value={price}
          onChange={(event) => setPrice(event.target.value.replace(/[^\d]/g, ""))}
          inputMode="numeric"
          className={fieldClass}
        />
      </label>
      <label className="mt-3 block text-sm font-semibold text-ink">
        Sous-menu
        <select value={target} onChange={(event) => setTarget(event.target.value)} className={fieldClass}>
          {submenus.map((submenu) => (
            <option key={submenu.id} value={submenu.id}>
              {submenu.menuName} — {submenu.name}
            </option>
          ))}
        </select>
      </label>
      <div className="mt-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={compose}
            onChange={(event) => setCompose(event.target.checked)}
            className="h-5 w-5 accent-octopus"
          />
          Composition
        </label>
        <p className="mt-1 text-xs leading-relaxed text-ink/60">
          Cochez pour afficher la liste. Chaque type de plat peut en avoir. Inclus : le client peut le retirer sans
          changer le prix. Prix extra : chaque unité en plus.
        </p>
        {compose ? (
        <>
        <ul className="mt-3 space-y-3">
          {parts.map((part) => (
            <li key={part.key} className="rounded-2xl bg-sea/50 p-3">
              <label className="block text-sm font-semibold text-ink">
                Nom
                <input
                  value={part.name}
                  onChange={(event) =>
                    setParts((current) =>
                      current.map((item) => (item.key === part.key ? { ...item, name: event.target.value } : item)),
                    )
                  }
                  placeholder="Fromage"
                  className={fieldClass}
                />
              </label>
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <label className="block min-w-28 flex-1 text-sm font-semibold text-ink">
                  Extra DH
                  <input
                    value={part.extraPrice}
                    onChange={(event) =>
                      setParts((current) =>
                        current.map((item) =>
                          item.key === part.key
                            ? { ...item, extraPrice: event.target.value.replace(/[^\d]/g, "") }
                            : item,
                        ),
                      )
                    }
                    inputMode="numeric"
                    className={fieldClass}
                  />
                </label>
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={part.included}
                    onChange={(event) =>
                      setParts((current) =>
                        current.map((item) =>
                          item.key === part.key ? { ...item, included: event.target.checked } : item,
                        ),
                      )
                    }
                  />
                  Inclus
                </label>
                <button
                  type="button"
                  onClick={() => setParts((current) => current.filter((item) => item.key !== part.key))}
                  className="mb-1 rounded-full px-3 py-2 text-sm font-semibold text-coral"
                >
                  Retirer
                </button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          disabled={parts.length >= MAX_OPTIONS}
          onClick={() =>
            setParts((current) => [
              ...current,
              { key: crypto.randomUUID(), name: "", included: true, extraPrice: "0" },
            ])
          }
          className="mt-3 rounded-full px-3 py-2 text-sm font-semibold text-octopus disabled:opacity-50"
        >
          Ajouter un composant
        </button>
        </>
        ) : null}
      </div>
      <label className="mt-3 block text-sm font-semibold text-ink">
        Photo
        <input name="image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" />
      </label>
      <p className="mt-1 text-xs text-ink/60">JPG, PNG ou WEBP. 2 Mo maximum.</p>
      {article?.image ? (
        <label className="mt-2 flex items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={removeImage}
            onChange={(event) => setRemoveImage(event.target.checked)}
          />
          Retirer la photo
        </label>
      ) : null}
      <input type="hidden" name="storeId" value={shop} />
      {formError ? <p className="mt-3 text-sm font-medium text-coral">{formError}</p> : null}
      </div>
      <div className="flex gap-2 border-t border-ink/10 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onClose}
          className="h-11 flex-1 rounded-full border border-ink/15 text-sm font-semibold"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={busy || (compose && !partsReady) || name.trim().length < 2 || price.length === 0}
          className="h-11 flex-1 rounded-full bg-octopus text-sm font-semibold text-white disabled:opacity-60"
        >
          Enregistrer
        </button>
      </div>
    </form>
  );
}

