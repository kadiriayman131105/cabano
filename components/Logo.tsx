export function Logo({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="32" fill="#D6E6F2" />
      <ellipse cx="32" cy="24" rx="11" ry="10" fill="#4D8EB4" />
      <circle cx="28" cy="23" r="1.7" fill="#ffffff" />
      <circle cx="36" cy="23" r="1.7" fill="#ffffff" />
      <path
        fill="#4D8EB4"
        d="M22 30c-1 6-4 10-8 12 3 1 6-1 8-4-2 6-2 12 2 16 3-5 3-10 2-14 2 7 6 12 10 12 2-6 1-12-1-16 4 5 9 7 13 5-3-3-5-8-6-13-2 3-6 5-10 4 1-4 4-8 4-8-4 1-8 0-14 6z"
      />
      <path
        d="M41 15c3-4 8-3 9 1"
        fill="none"
        stroke="#B22C4C"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
