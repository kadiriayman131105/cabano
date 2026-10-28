import { Suspense } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { ADMIN_COOKIE, isValidSession } from "@/lib/session";

export const metadata: Metadata = { title: "Connexion" };
export const instant = false;

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginScreen />}>
      <LoginGate />
    </Suspense>
  );
}

async function LoginGate() {
  await connection();
  const now = Date.now();
  const jar = await cookies();
  if (isValidSession(jar.get(ADMIN_COOKIE)?.value, now)) redirect("/admin");
  return <LoginScreen />;
}

function LoginScreen() {
  return (
    <main className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-octopus">Cabano</p>
      <h1 className="mt-2 text-3xl font-bold text-ink">Gestion</h1>
      <p className="mt-2 text-sm text-ink/70">Casablanca et Bouskoura. Un seul accès.</p>
      <LoginForm />
    </main>
  );
}
