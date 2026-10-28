"use client";

import { useEffect, useRef } from "react";
import type { MenuSection } from "@/types";

type CategoryTabsProps = {
  sections: MenuSection[];
  activeId: string;
  onSelect: (id: string) => void;
};

export function CategoryTabs({ sections, activeId, onSelect }: CategoryTabsProps) {
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = scroller.current;
    const current = parent?.querySelector<HTMLElement>(`[data-cat="${activeId}"]`);
    if (!parent || !current) return;
    const left = current.offsetLeft - parent.clientWidth / 2 + current.clientWidth / 2;
    parent.scrollTo({ left, behavior: "smooth" });
  }, [activeId]);

  if (sections.length === 0) return null;

  return (
    <div className="sticky top-[var(--header-h)] z-30 -mx-4 bg-[#f4f7fb]/95 px-4 py-3 backdrop-blur-md">
      <div ref={scroller} className="flex touch-pan-x gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((section) => {
          const active = section.id === activeId;
          return (
            <button
              key={section.id}
              type="button"
              data-cat={section.id}
              onClick={() => onSelect(section.id)}
              className={`press shrink-0 rounded-full px-4 py-2.5 text-sm font-semibold ${
                active ? "bg-ink text-white shadow-sm" : "bg-white text-ink shadow-sm"
              }`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
