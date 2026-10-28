import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";

const globalForDb = globalThis as unknown as { cabanoDb?: DatabaseSync };
let schemaReady = false;

const STARTER_PARTS: [string, number][] = [
  ["Sauce tomate", 3],
  ["Œuf", 3],
  ["Fromage", 5],
  ["Olive", 2],
];

function seedComposants(db: DatabaseSync) {
  const ready = db.prepare(`SELECT value FROM catalog_meta WHERE key = 'composants'`).get();
  if (ready) return;
  const seeded = db.prepare(`SELECT value FROM catalog_meta WHERE key = 'seeded'`).get();
  if (!seeded) {
    db.prepare(`INSERT INTO catalog_meta (key, value) VALUES ('composants', '1')`).run();
    return;
  }
  const articles = db
    .prepare(
      `SELECT articles.id AS id
       FROM articles
       JOIN submenus ON submenus.id = articles.submenu_id
       JOIN menus ON menus.id = submenus.menu_id
       WHERE menus.id LIKE '%-sandwichs' OR menus.id LIKE '%-m9ila'`,
    )
    .all() as { id: string }[];
  const insert = db.prepare(
    `INSERT INTO composants (id, article_id, name, included, extra_price, sort_order) VALUES (?, ?, ?, 1, ?, ?)`,
  );
  for (const article of articles) {
    STARTER_PARTS.forEach((part, index) => {
      insert.run(randomBytes(6).toString("hex"), article.id, part[0], part[1], index);
    });
  }
  db.prepare(`INSERT INTO catalog_meta (key, value) VALUES ('composants', '1')`).run();
}

export function getDb() {
  if (!globalForDb.cabanoDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true });
    globalForDb.cabanoDb = new DatabaseSync(path.join(dir, "cabano.db"));
  }

  if (!schemaReady) {
    globalForDb.cabanoDb.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        token TEXT NOT NULL UNIQUE,
        store_id TEXT NOT NULL,
        items_json TEXT NOT NULL,
        subtotal INTEGER NOT NULL,
        delivery_fee INTEGER NOT NULL,
        total INTEGER NOT NULL,
        customer_json TEXT NOT NULL,
        note TEXT,
        payment_method TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        local_date TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS orders_local_date ON orders (local_date);
      CREATE TABLE IF NOT EXISTS login_attempts (
        key TEXT PRIMARY KEY,
        count INTEGER NOT NULL,
        reset_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS menus (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS submenus (
        id TEXT PRIMARY KEY,
        menu_id TEXT NOT NULL,
        name TEXT NOT NULL,
        sort_order INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS articles (
        id TEXT PRIMARY KEY,
        store_id TEXT NOT NULL,
        submenu_id TEXT NOT NULL,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        price INTEGER NOT NULL,
        image TEXT,
        sort_order INTEGER NOT NULL,
        available INTEGER NOT NULL DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS catalog_meta (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS composants (
        id TEXT PRIMARY KEY,
        article_id TEXT NOT NULL,
        name TEXT NOT NULL,
        included INTEGER NOT NULL DEFAULT 1,
        extra_price INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL
      );
      CREATE INDEX IF NOT EXISTS composants_article ON composants (article_id);
    `);
    seedComposants(globalForDb.cabanoDb);
    const articleColumns = globalForDb.cabanoDb.prepare(`PRAGMA table_info(articles)`).all();
    const hasAvailable = articleColumns.some((column) => String(column.name) === "available");
    if (!hasAvailable) {
      globalForDb.cabanoDb.exec(
        `ALTER TABLE articles ADD COLUMN available INTEGER NOT NULL DEFAULT 1`,
      );
    }
    schemaReady = true;
  }

  return globalForDb.cabanoDb;
}
