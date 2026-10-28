import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { AdminBar } from "@/components/admin/AdminBar";
import { ADMIN_COOKIE, isValidSession } from "@/lib/session";

export const instant = false;

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<AdminBar />}>
      <AuthedPanel>{children}</AuthedPanel>
    </Suspense>
  );
}

async function AuthedPanel({ children }: { children: React.ReactNode }) {
  await connection();
  const now = Date.now();
  const jar = await cookies();
  if (!isValidSession(jar.get(ADMIN_COOKIE)?.value, now)) redirect("/admin/login");

  return (
    <>
      <AdminBar />
      {children}
    </>
  );
}
