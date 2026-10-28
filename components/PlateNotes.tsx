import { optionNote } from "@/lib/plate";
import type { PlateChoice } from "@/types";

export function PlateNotes({ options }: { options?: PlateChoice[] }) {
  const notes = (options ?? []).map((option) => optionNote(option)).filter((note) => note !== null);
  if (notes.length === 0) return null;
  return <p className="mt-1 text-xs font-medium text-ink/60">{notes.join(" · ")}</p>;
}
