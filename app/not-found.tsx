import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-octopus">Cabano</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Page introuvable</h1>
      <Link
        href="/"
        className="press mt-6 inline-flex h-12 items-center rounded-2xl bg-ink px-5 font-semibold text-white"
      >
        Retour à l’accueil
      </Link>
    </main>
  );
}
