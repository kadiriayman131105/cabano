export const MAX_LINE_QTY = 500;
export const MAX_OPTIONS = 12;
export const MAX_OPTION_QTY = 5;
export const MAX_EXTRA_PRICE = 500;
export const MAX_LINE_COMMENT = 120;
export const MAX_DISTINCT_LINES = 40;
export const MAX_DISTINCT_MESSAGE = "40 plats différents maximum par commande.";

export function distinctLineError(json: unknown) {
  if (!json || typeof json !== "object" || !("items" in json)) return null;
  const items = (json as { items?: unknown }).items;
  if (!Array.isArray(items) || items.length <= MAX_DISTINCT_LINES) return null;
  return MAX_DISTINCT_MESSAGE;
}
