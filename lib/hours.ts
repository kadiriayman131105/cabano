export const CLOSED_MESSAGE =
  "Ce magasin est fermé. Commandes de 12h à 23h, sauf le vendredi.";

export function isOpenNow(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Casablanca",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (weekday === "Fri") return false;

  const minutes = (hour === 24 ? 0 : hour) * 60 + minute;
  return minutes >= 12 * 60 && minutes < 23 * 60;
}
