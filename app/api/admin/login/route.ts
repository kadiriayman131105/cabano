import { cookies } from "next/headers";
import { loginBlocked, loginFailed, loginSucceeded, takeSlot } from "@/lib/loginLimit";
import {
  LOGIN_GATE_COOKIE,
  createLoginGate,
  loginBucket,
  loginGateCookieOptions,
  readLoginGate,
} from "@/lib/loginGate";
import {
  ADMIN_COOKIE,
  createSessionToken,
  passwordsMatch,
  sessionCookieOptions,
} from "@/lib/session";

const GATE_MINT_KEY = "gate-mints";
const GATE_MINT_MAX = 8;
const GATE_MINT_WINDOW_MS = 15 * 60 * 1000;

export async function GET() {
  if (!process.env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: "Connexion administrateur non configurée." }, { status: 500 });
  }

  const jar = await cookies();
  if (readLoginGate(jar.get(LOGIN_GATE_COOKIE)?.value)) {
    return Response.json({ ok: true });
  }
  if (!takeSlot(GATE_MINT_KEY, GATE_MINT_MAX, GATE_MINT_WINDOW_MS)) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }
  const minted = createLoginGate();
  if (!minted) {
    return Response.json({ error: "Connexion administrateur non configurée." }, { status: 500 });
  }
  jar.set(LOGIN_GATE_COOKIE, minted, loginGateCookieOptions());
  return Response.json({ ok: true });
}

export async function POST(request: Request) {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected || !process.env.ADMIN_SESSION_SECRET) {
    return Response.json({ error: "Connexion administrateur non configurée." }, { status: 500 });
  }

  const jar = await cookies();
  const gateId = readLoginGate(jar.get(LOGIN_GATE_COOKIE)?.value);
  if (!gateId) {
    return Response.json({ error: "Activez les cookies, puis réessayez." }, { status: 400 });
  }
  const key = loginBucket(gateId);
  if (loginBlocked(key)) {
    return Response.json(
      { error: "Trop de tentatives. Réessayez dans 15 minutes." },
      { status: 429 },
    );
  }

  let password = "";
  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? "";
  } catch {
    password = "";
  }

  if (!password || !passwordsMatch(password, expected)) {
    loginFailed(key);
    return Response.json({ error: "Mot de passe incorrect." }, { status: 401 });
  }

  loginSucceeded(key);
  jar.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions());
  return Response.json({ ok: true });
}
