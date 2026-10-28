import type { DayPoint, StoreFilter } from "@/lib/adminStats";

export function MonthChart({
  days,
  store,
  selectedDay,
  mode,
}: {
  days: DayPoint[];
  store: StoreFilter;
  selectedDay: string;
  mode: "orders" | "revenue";
}) {
  const value = (point: DayPoint, shop: "casablanca" | "bouskoura") => point[shop][mode];
  const max = Math.max(
    1,
    ...days.map((point) => {
      if (store === "casablanca") return value(point, "casablanca");
      if (store === "bouskoura") return value(point, "bouskoura");
      return value(point, "casablanca") + value(point, "bouskoura");
    }),
  );

  return (
    <div>
      <div className="flex h-36 items-end gap-0.5">
        {days.map((point) => {
          const casa = value(point, "casablanca");
          const bouskoura = value(point, "bouskoura");
          const selected = point.date === selectedDay;
          return (
            <div key={point.date} className="flex h-full min-w-0 flex-1 items-end gap-px">
              {store !== "bouskoura" ? (
                <div
                  className={`w-full rounded-t ${selected ? "bg-ink" : "bg-octopus"}`}
                  style={{ height: `${(casa / max) * 100}%` }}
                />
              ) : null}
              {store !== "casablanca" ? (
                <div
                  className={`w-full rounded-t ${selected ? "bg-ink" : "bg-coral"}`}
                  style={{ height: `${(bouskoura / max) * 100}%` }}
                />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-[10px] text-ink/50">
        <span>1</span>
        <span>{days.length}</span>
      </div>
    </div>
  );
}
