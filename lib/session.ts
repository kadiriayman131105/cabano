import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "cabano-admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

function secret() {
  const value = process.env.ADMIN_SESSION_SECRET;
  if (!value) throw new Error("ADMIN_SESSION_SECRET manquant");
  return value;
}

export function passwordsMatch(input: string, expected: string) {
  const left = createHash("sha256").update(input).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

export function createSessionToken() {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_SECONDS * 1000 })).toString("base64url");
  const signature = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function isValidSession(token: string | undefined, now: number) {
  if (!token) return false;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return false;
  const payload = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  let expected = "";
  try {
    expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  } catch {
    return false;
  }
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { exp?: number };
    return typeof data.exp === "number" && data.exp > now;
  } catch {
    return false;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}

export async function requireAdmin() {
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value, Date.now())) {
    return Response.json({ error: "Connexion requise." }, { status: 401 });
  }
  return null;
}
