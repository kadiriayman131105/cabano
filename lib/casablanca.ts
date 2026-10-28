export function casablancaToday(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Casablanca",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function daysInMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) return 30;
  return new Date(year, monthNumber, 0).getDate();
}

export function monthBounds(month: string) {
  const count = daysInMonth(month);
  return {
    start: `${month}-01`,
    end: `${month}-${String(count).padStart(2, "0")}`,
    dates: Array.from({ length: count }, (_, index) => {
      return `${month}-${String(index + 1).padStart(2, "0")}`;
    }),
  };
}
