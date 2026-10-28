export function SpiceMark({ spicy }: { spicy?: boolean }) {
  if (spicy !== true && spicy !== false) return null;
  return (
    <span className={`mt-0.5 block text-xs font-semibold ${spicy ? "text-coral" : "text-ink/55"}`}>
      {spicy ? "Épicé" : "Non épicé"}
    </span>
  );
}
