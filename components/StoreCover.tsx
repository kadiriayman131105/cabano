export function StoreCover({
  storeId,
  className = "",
}: {
  storeId: string;
  className?: string;
}) {
  const coastal = storeId === "casablanca";

  return (
    <div className={`relative overflow-hidden ${className}`} aria-hidden="true">
      <div
        className={
          coastal
            ? "absolute inset-0 bg-gradient-to-br from-[#b7d7ea] via-[#4d8eb4] to-[#0a1428]"
            : "absolute inset-0 bg-gradient-to-br from-[#163044] via-[#3f86ab] to-[#8d3550]"
        }
      />
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/25" />
      <div className="absolute -bottom-14 left-4 h-36 w-36 rounded-full bg-coral/35" />
      <div className="absolute bottom-6 right-6 h-16 w-16 rounded-full bg-white/10" />
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/30 to-transparent" />
    </div>
  );
}
