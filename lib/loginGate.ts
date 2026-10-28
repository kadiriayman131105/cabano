import { createHmac, randomBytes, timingSafeEqual } from "crypto";

export const LOGIN_GATE_COOKIE = "cabano-gate";
export const SHARED_LOGIN_KEY = "shared";

function secret() {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

function sign(id: string) {
  return createHmac("sha256", secret()).update(`gate:${id}`).digest("base64url");
}

export function readLoginGate(token: string | undefined) {
  if (!token || !secret()) return null;
  const splitAt = token.lastIndexOf(".");
  if (splitAt <= 0) return null;
  const id = token.slice(0, splitAt);
  const signature = token.slice(splitAt + 1);
  if (!/^[A-Za-z0-9_-]{8,32}$/.test(id)) return null;
  const expected = sign(id);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  return id;
}

export function createLoginGate() {
  if (!secret()) return null;
  const id = randomBytes(9).toString("base64url");
  return `${id}.${sign(id)}`;
}

export function loginGateCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function loginBucket(gateId: string | null) {
  return gateId ? `gate:${gateId}` : SHARED_LOGIN_KEY;
}
