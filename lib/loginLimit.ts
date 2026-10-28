import { getDb } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function asNumber(value: unknown) {
  return typeof value === "bigint" ? Number(value) : Number(value);
}

export function loginBlocked(key: string) {
  const row = getDb().prepare(`SELECT count, reset_at FROM login_attempts WHERE key = ?`).get(key);
  if (!row) return false;
  if (asNumber(row.reset_at) <= Date.now()) {
    getDb().prepare(`DELETE FROM login_attempts WHERE key = ?`).run(key);
    return false;
  }
  return asNumber(row.count) >= MAX_ATTEMPTS;
}

export function loginFailed(key: string) {
  const now = Date.now();
  const db = getDb();
  const row = db.prepare(`SELECT count, reset_at FROM login_attempts WHERE key = ?`).get(key);
  if (!row || asNumber(row.reset_at) <= now) {
    db.prepare(
      `INSERT INTO login_attempts (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
    ).run(key, now + WINDOW_MS);
    return 1;
  }
  db.prepare(`UPDATE login_attempts SET count = count + 1 WHERE key = ?`).run(key);
  const updated = db.prepare(`SELECT count FROM login_attempts WHERE key = ?`).get(key);
  return asNumber(updated?.count);
}

export function loginSucceeded(key: string) {
  getDb().prepare(`DELETE FROM login_attempts WHERE key = ?`).run(key);
}

export function takeSlot(key: string, max: number, windowMs: number) {
  const now = Date.now();
  const db = getDb();
  const row = db.prepare(`SELECT count, reset_at FROM login_attempts WHERE key = ?`).get(key);
  if (!row || asNumber(row.reset_at) <= now) {
    db.prepare(
      `INSERT INTO login_attempts (key, count, reset_at) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, reset_at = excluded.reset_at`,
    ).run(key, now + windowMs);
    return true;
  }
  if (asNumber(row.count) >= max) return false;
  db.prepare(`UPDATE login_attempts SET count = count + 1 WHERE key = ?`).run(key);
  return true;
}
