import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { categories, products } from "@/data/menu";
import { getStore, stores } from "@/data/stores";
import { getDb } from "@/lib/db";
import { MAX_EXTRA_PRICE, MAX_OPTIONS } from "@/lib/limits";
import type { MenuSection, Product, ProductOption } from "@/types";

export type CatalogArticle = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  available: boolean;
  options: ProductOption[];
};

export type CatalogSubmenu = {
  id: string;
  name: string;
  articles: CatalogArticle[];
};

export type CatalogMenu = {
  id: string;
  name: string;
  submenus: CatalogSubmenu[];
};

const IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

function uploadsDir() {
  const dir = path.join(process.cwd(), "public", "uploads");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function safeImagePath(image: string | null) {
  if (!image || !/^\/uploads\/[a-zA-Z0-9._-]+$/.test(image)) return null;
  return path.join(process.cwd(), "public", image);
}

function removeImage(image: string | null) {
  const file = safeImagePath(image);
  if (!file) return;
  fs.rmSync(file, { force: true });
}

export async function saveArticleImage(file: File) {
  const extension = IMAGE_TYPES[file.type];
  if (!extension) return { error: "Photo acceptée : JPG, PNG ou WEBP." as const };
  if (file.size > 2_000_000) return { error: "Photo trop lourde. Maximum 2 Mo." as const };
  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > 2_000_000) return { error: "Photo trop lourde. Maximum 2 Mo." as const };
  const filename = `${randomBytes(12).toString("hex")}.${extension}`;
  fs.writeFileSync(path.join(uploadsDir(), filename), Buffer.from(buffer));
  return { image: `/uploads/${filename}` as const };
}

function nextSort(table: "menus" | "submenus" | "articles", column: string, value: string) {
  const row = getDb()
    .prepare(`SELECT MAX(sort_order) AS maxSort FROM ${table} WHERE ${column} = ?`)
    .get(value);
  return asNumber(row?.maxSort) + 1;
}

export function ensureCatalog() {
  const db = getDb();
  db.exec("BEGIN IMMEDIATE");
  const seeded = db.prepare(`SELECT value FROM catalog_meta WHERE key = 'seeded'`).get();
  if (seeded) {
    db.exec("COMMIT");
    return;
  }

  const insertMenu = db.prepare(
    `INSERT INTO menus (id, store_id, name, sort_order) VALUES (?, ?, ?, ?)`,
  );
  const insertSubmenu = db.prepare(
    `INSERT INTO submenus (id, menu_id, name, sort_order) VALUES (?, ?, ?, ?)`,
  );
  const insertArticle = db.prepare(
    `INSERT INTO articles (id, store_id, submenu_id, name, description, price, image, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, NULL, ?)`,
  );

  try {
    for (const store of stores) {
      categories.forEach((category, menuIndex) => {
        const menuId = `${store.id}-${category.id}`;
        const submenuId = `${menuId}-base`;
        insertMenu.run(menuId, store.id, category.label, menuIndex);
        insertSubmenu.run(submenuId, menuId, category.label, 0);
        products
          .filter((product) => product.category === category.id && product.storeIds.includes(store.id))
          .forEach((product, articleIndex) => {
            insertArticle.run(
              `${store.id}-${product.id}`,
              store.id,
              submenuId,
              product.name,
              product.description,
              product.price,
              articleIndex,
            );
          });
      });
    }
    db.prepare(`INSERT INTO catalog_meta (key, value) VALUES ('seeded', '1')`).run();
    db.exec("COMMIT");
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
}

function optionRow(row: Record<string, unknown>): ProductOption {
  return {
    id: String(row.id),
    name: String(row.name),
    included: asNumber(row.included) !== 0,
    extraPrice: asNumber(row.extra_price),
  };
}

function optionsForStore(storeId: string) {
  const rows = getDb()
    .prepare(
      `SELECT composants.id, composants.article_id, composants.name, composants.included, composants.extra_price
       FROM composants
       JOIN articles ON articles.id = composants.article_id
       WHERE articles.store_id = ?
       ORDER BY composants.sort_order, composants.name`,
    )
    .all(storeId);
  const grouped = new Map<string, ProductOption[]>();
  for (const row of rows) {
    const articleId = String(row.article_id);
    const list = grouped.get(articleId) ?? [];
    list.push(optionRow(row));
    grouped.set(articleId, list);
  }
  return grouped;
}

function optionsForArticle(articleId: string) {
  return getDb()
    .prepare(
      `SELECT id, name, included, extra_price FROM composants WHERE article_id = ? ORDER BY sort_order, name`,
    )
    .all(articleId)
    .map((row) => optionRow(row));
}

function articleRow(row: Record<string, unknown>, options: ProductOption[] = []): CatalogArticle {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    price: asNumber(row.price),
    image: row.image ? String(row.image) : null,
    available: row.available == null || asNumber(row.available) !== 0,
    options,
  };
}

export function listCatalog(storeId: string): CatalogMenu[] {
  ensureCatalog();
  const db = getDb();
  const optionMap = optionsForStore(storeId);
  const menus = db
    .prepare(`SELECT id, name FROM menus WHERE store_id = ? ORDER BY sort_order, name`)
    .all(storeId);
  return menus.map((menu) => {
    const submenus = db
      .prepare(`SELECT id, name FROM submenus WHERE menu_id = ? ORDER BY sort_order, name`)
      .all(String(menu.id));
    return {
      id: String(menu.id),
      name: String(menu.name),
      submenus: submenus.map((submenu) => {
        const articles = db
          .prepare(
            `SELECT id, name, description, price, image, available FROM articles WHERE submenu_id = ? ORDER BY sort_order, name`,
          )
          .all(String(submenu.id));
        return {
          id: String(submenu.id),
          name: String(submenu.name),
          articles: articles.map((article) => articleRow(article, optionMap.get(String(article.id)) ?? [])),
        };
      }),
    };
  });
}

export function getMenu(storeId: string): MenuSection[] {
  return listCatalog(storeId)
    .map((menu) => {
      const groups = menu.submenus
        .map((submenu) => ({
          id: submenu.id,
          label: submenu.name,
          products: submenu.articles
            .filter((article) => article.available)
            .map((article) => toProduct(article, storeId, menu.id, menu.name)),
        }))
        .filter((group) => group.products.length > 0);
      return {
        id: menu.id,
        label: menu.name,
        groups,
        products: groups.flatMap((group) => group.products),
      };
    })
    .filter((section) => section.products.length > 0);
}

export function findArticle(productId: string): { product: Product; available: boolean } | undefined {
  ensureCatalog();
  const row = getDb()
    .prepare(
      `SELECT articles.id, articles.store_id, articles.name, articles.description, articles.price, articles.image, articles.available, menus.id AS menu_id, menus.name AS menu_name
       FROM articles
       JOIN submenus ON submenus.id = articles.submenu_id
       JOIN menus ON menus.id = submenus.menu_id
       WHERE articles.id = ?`,
    )
    .get(productId);
  if (!row) return undefined;
  const article = articleRow(row, optionsForArticle(String(row.id)));
  return {
    product: toProduct(article, String(row.store_id), String(row.menu_id), String(row.menu_name)),
    available: article.available,
  };
}

export function getProduct(productId: string): Product | undefined {
  const found = findArticle(productId);
  if (!found?.available) return undefined;
  return found.product;
}

export function setArticleAvailable(id: string, available: boolean) {
  ensureCatalog();
  const result = getDb()
    .prepare(`UPDATE articles SET available = ? WHERE id = ?`)
    .run(available ? 1 : 0, id);
  if (result.changes < 1) return { error: "Article introuvable." as const };
  return { ok: true as const };
}

function offersSpice(menuId: string, menuName: string) {
  const name = menuName
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  return !menuId.toLowerCase().includes("boisson") && !name.includes("boisson");
}

function toProduct(article: CatalogArticle, storeId: string, menuId: string, menuName: string): Product {
  return {
    id: article.id,
    storeIds: [storeId],
    category: menuId,
    name: article.name,
    description: article.description,
    price: article.price,
    image: article.image,
    spicyChoice: offersSpice(menuId, menuName),
    options: article.options,
  };
}

function cleanName(value: string) {
  const name = value.trim();
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

export function createMenu(storeId: string, rawName: string) {
  if (!getStore(storeId)) return { error: "Magasin inconnu." as const };
  const name = cleanName(rawName);
  if (!name) return { error: "Indiquez un nom de menu." as const };
  ensureCatalog();
  const id = randomBytes(8).toString("hex");
  getDb()
    .prepare(`INSERT INTO menus (id, store_id, name, sort_order) VALUES (?, ?, ?, ?)`)
    .run(id, storeId, name, nextSort("menus", "store_id", storeId));
  return { id };
}

export function renameMenu(id: string, rawName: string) {
  const name = cleanName(rawName);
  if (!name) return { error: "Indiquez un nom de menu." as const };
  ensureCatalog();
  const result = getDb().prepare(`UPDATE menus SET name = ? WHERE id = ?`).run(name, id);
  if (result.changes < 1) return { error: "Menu introuvable." as const };
  return { ok: true as const };
}

export function deleteMenu(id: string) {
  ensureCatalog();
  const db = getDb();
  const images = db
    .prepare(
      `SELECT articles.image FROM articles
       JOIN submenus ON submenus.id = articles.submenu_id
       WHERE submenus.menu_id = ?`,
    )
    .all(id);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `DELETE FROM composants WHERE article_id IN (
         SELECT articles.id FROM articles
         JOIN submenus ON submenus.id = articles.submenu_id
         WHERE submenus.menu_id = ?
       )`,
    ).run(id);
    db.prepare(
      `DELETE FROM articles WHERE submenu_id IN (SELECT id FROM submenus WHERE menu_id = ?)`,
    ).run(id);
    db.prepare(`DELETE FROM submenus WHERE menu_id = ?`).run(id);
    const result = db.prepare(`DELETE FROM menus WHERE id = ?`).run(id);
    db.exec("COMMIT");
    if (result.changes < 1) return { error: "Menu introuvable." as const };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
  for (const row of images) removeImage(row.image ? String(row.image) : null);
  return { ok: true as const };
}

function menuStore(menuId: string) {
  ensureCatalog();
  const row = getDb().prepare(`SELECT store_id FROM menus WHERE id = ?`).get(menuId);
  return row ? String(row.store_id) : null;
}

export function createSubmenu(menuId: string, rawName: string) {
  if (!menuStore(menuId)) return { error: "Menu introuvable." as const };
  const name = cleanName(rawName);
  if (!name) return { error: "Indiquez un nom de sous-menu." as const };
  const id = randomBytes(8).toString("hex");
  getDb()
    .prepare(`INSERT INTO submenus (id, menu_id, name, sort_order) VALUES (?, ?, ?, ?)`)
    .run(id, menuId, name, nextSort("submenus", "menu_id", menuId));
  return { id };
}

export function renameSubmenu(id: string, rawName: string) {
  const name = cleanName(rawName);
  if (!name) return { error: "Indiquez un nom de sous-menu." as const };
  ensureCatalog();
  const result = getDb().prepare(`UPDATE submenus SET name = ? WHERE id = ?`).run(name, id);
  if (result.changes < 1) return { error: "Sous-menu introuvable." as const };
  return { ok: true as const };
}

export function deleteSubmenu(id: string) {
  ensureCatalog();
  const db = getDb();
  const images = db.prepare(`SELECT image FROM articles WHERE submenu_id = ?`).all(id);
  db.exec("BEGIN IMMEDIATE");
  try {
    db.prepare(
      `DELETE FROM composants WHERE article_id IN (SELECT id FROM articles WHERE submenu_id = ?)`,
    ).run(id);
    db.prepare(`DELETE FROM articles WHERE submenu_id = ?`).run(id);
    const result = db.prepare(`DELETE FROM submenus WHERE id = ?`).run(id);
    db.exec("COMMIT");
    if (result.changes < 1) return { error: "Sous-menu introuvable." as const };
  } catch (error) {
    try {
      db.exec("ROLLBACK");
    } catch {
      // The transaction was already closed.
    }
    throw error;
  }
  for (const row of images) removeImage(row.image ? String(row.image) : null);
  return { ok: true as const };
}

export function submenuStore(submenuId: string) {
  ensureCatalog();
  const row = getDb()
    .prepare(
      `SELECT menus.store_id FROM submenus JOIN menus ON menus.id = submenus.menu_id WHERE submenus.id = ?`,
    )
    .get(submenuId);
  return row ? String(row.store_id) : null;
}

function cleanArticle(input: { name: string; description: string; price: number }) {
  const name = input.name.trim();
  const description = input.description.trim();
  if (name.length < 2 || name.length > 80) return { error: "Indiquez le nom de l’article." as const };
  if (description.length > 300) return { error: "La description est trop longue." as const };
  if (!Number.isInteger(input.price) || input.price < 0 || input.price > 99999) {
    return { error: "Indiquez un prix en dirhams." as const };
  }
  return { name, description, price: input.price };
}

export type OptionDraft = {
  id?: string;
  name: string;
  included: boolean;
  extraPrice: number;
};

function cleanOptions(raw: OptionDraft[] | undefined) {
  if (!raw) return { options: [] as OptionDraft[] };
  if (raw.length > MAX_OPTIONS) return { error: "12 composants maximum par plat." as const };
  const options: OptionDraft[] = [];
  const names = new Set<string>();
  for (const option of raw) {
    const name = option.name.trim();
    if (name.length < 2 || name.length > 40) return { error: "Nom de composant invalide." as const };
    const key = name.toLocaleLowerCase("fr");
    if (names.has(key)) return { error: "Deux composants portent le même nom." as const };
    names.add(key);
    if (!Number.isInteger(option.extraPrice) || option.extraPrice < 0 || option.extraPrice > MAX_EXTRA_PRICE) {
      return { error: "Prix extra invalide." as const };
    }
    options.push({
      id: option.id,
      name,
      included: option.included === true,
      extraPrice: option.extraPrice,
    });
  }
  return { options };
}

function saveOptions(articleId: string, options: OptionDraft[]) {
  const db = getDb();
  const current = new Set(
    db
      .prepare(`SELECT id FROM composants WHERE article_id = ?`)
      .all(articleId)
      .map((row) => String(row.id)),
  );
  const kept = new Set<string>();
  const update = db.prepare(
    `UPDATE composants SET name = ?, included = ?, extra_price = ?, sort_order = ? WHERE id = ? AND article_id = ?`,
  );
  const insert = db.prepare(
    `INSERT INTO composants (id, article_id, name, included, extra_price, sort_order) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  options.forEach((option, index) => {
    const included = option.included ? 1 : 0;
    if (option.id && current.has(option.id)) {
      update.run(option.name, included, option.extraPrice, index, option.id, articleId);
      kept.add(option.id);
      return;
    }
    insert.run(randomBytes(6).toString("hex"), articleId, option.name, included, option.extraPrice, index);
  });
  const remove = db.prepare(`DELETE FROM composants WHERE id = ? AND article_id = ?`);
  for (const id of current) {
    if (!kept.has(id)) remove.run(id, articleId);
  }
}

export function createArticle(input: {
  storeId: string;
  submenuId: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  options?: OptionDraft[];
}) {
  const storeId = submenuStore(input.submenuId);
  if (!storeId || storeId !== input.storeId) {
    removeImage(input.image);
    return { error: "Sous-menu introuvable." as const };
  }
  const cleaned = cleanArticle(input);
  if ("error" in cleaned) {
    removeImage(input.image);
    return cleaned;
  }
  const options = cleanOptions(input.options);
  if ("error" in options) {
    removeImage(input.image);
    return options;
  }
  const id = randomBytes(8).toString("hex");
  getDb()
    .prepare(
      `INSERT INTO articles (id, store_id, submenu_id, name, description, price, image, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      storeId,
      input.submenuId,
      cleaned.name,
      cleaned.description,
      cleaned.price,
      input.image,
      nextSort("articles", "submenu_id", input.submenuId),
    );
  saveOptions(id, options.options);
  return { id };
}

export function updateArticle(input: {
  id: string;
  submenuId: string;
  name: string;
  description: string;
  price: number;
  image: string | null;
  replaceImage: boolean;
  options?: OptionDraft[];
}) {
  ensureCatalog();
  const current = getDb()
    .prepare(`SELECT image, store_id FROM articles WHERE id = ?`)
    .get(input.id);
  if (!current) {
    removeImage(input.image);
    return { error: "Article introuvable." as const };
  }
  const storeId = submenuStore(input.submenuId);
  if (!storeId || storeId !== String(current.store_id)) {
    removeImage(input.image);
    return { error: "Sous-menu introuvable." as const };
  }
  const cleaned = cleanArticle(input);
  if ("error" in cleaned) {
    removeImage(input.image);
    return cleaned;
  }
  const options = cleanOptions(input.options);
  if ("error" in options) {
    removeImage(input.image);
    return options;
  }
  const previous = current.image ? String(current.image) : null;
  const image = input.replaceImage ? input.image : previous;
  const result = getDb()
    .prepare(
      `UPDATE articles SET submenu_id = ?, name = ?, description = ?, price = ?, image = ? WHERE id = ?`,
    )
    .run(input.submenuId, cleaned.name, cleaned.description, cleaned.price, image, input.id);
  if (result.changes < 1) return { error: "Article introuvable." as const };
  if (input.replaceImage && previous && previous !== image) removeImage(previous);
  saveOptions(input.id, options.options);
  return { ok: true as const };
}

export function deleteArticle(id: string) {
  ensureCatalog();
  const current = getDb().prepare(`SELECT image FROM articles WHERE id = ?`).get(id);
  if (!current) return { error: "Article introuvable." as const };
  getDb().prepare(`DELETE FROM composants WHERE article_id = ?`).run(id);
  getDb().prepare(`DELETE FROM articles WHERE id = ?`).run(id);
  removeImage(current.image ? String(current.image) : null);
  return { ok: true as const };
}
