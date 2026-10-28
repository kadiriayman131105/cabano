import { cookies } from "next/headers";
import { ADMIN_COOKIE, sessionCookieOptions } from "@/lib/session";

export async function POST() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0, expires: new Date(0) });
  return Response.json({ ok: true });
}
