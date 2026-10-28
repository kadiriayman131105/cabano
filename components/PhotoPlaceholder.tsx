export function PhotoPlaceholder({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-ink ${className}`} aria-hidden="true">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(77,142,180,0.95),transparent_58%),radial-gradient(circle_at_80%_90%,rgba(178,44,76,0.55),transparent_42%)]" />
      <svg viewBox="0 0 64 64" className="absolute inset-0 m-auto h-2/5 w-2/5 text-white/80">
        <path
          d="M18 28c2-8 10-12 14-12s12 4 14 12c4 1 8 5 8 10 0 6-5 10-11 10H21c-6 0-11-4-11-10 0-5 4-9 8-10z"
          fill="currentColor"
        />
        <path d="M24 24c2-3 5-4 8-4" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
