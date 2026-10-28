"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function prepareGate() {
    const response = await fetch("/api/admin/login", { method: "GET", cache: "no-store" });
    if (response.ok) return true;
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    setError(body?.error ?? "Connexion impossible.");
    return false;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const gateOk = await prepareGate();
      if (!gateOk) {
        setBusy(false);
        return;
      }
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(body?.error ?? "Connexion impossible.");
        setBusy(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Connexion impossible.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-semibold text-ink">Mot de passe</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-2xl border border-ink/15 px-4 py-3 outline-none focus:border-octopus"
        />
      </label>
      {error ? <p className="text-sm text-coral">{error}</p> : null}
      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="press h-12 w-full rounded-full bg-ink font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Connexion…" : "Entrer"}
      </button>
    </form>
  );
}
