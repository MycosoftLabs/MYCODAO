import React, { useState } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { cn } from "../../lib/utils";
import { activeFacetCount, type FacetGroup, type FacetSelection } from "../../lib/tissueFacets";

const COLLAPSED_OPTIONS = 10;

interface TissueFiltersProps {
  groups: FacetGroup[];
  selection: FacetSelection;
  onToggle: (groupId: string, value: string) => void;
  onClear: () => void;
  resultCount: number;
  totalCount: number;
  /** Explains what the counts are built from (e.g. "96 loaded taxa"). */
  basisNote: string;
  theme: "light" | "dark";
}

export function TissueFilters({
  groups,
  selection,
  onToggle,
  onClear,
  resultCount,
  totalCount,
  basisNote,
  theme,
}: TissueFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const active = activeFacetCount(selection);
  const isLight = theme === "light";

  return (
    <section
      aria-label="Catalog filters"
      className={cn(
        "rounded-lg border p-3 backdrop-blur-md",
        isLight ? "border-black/10 bg-white/50" : "border-white/10 bg-black/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          aria-expanded={isOpen}
          aria-controls="tissue-filter-groups"
          className={cn(
            "inline-flex min-h-[44px] items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-widest touch-manipulation",
            isLight ? "text-stone-700" : "text-white/80",
          )}
        >
          <SlidersHorizontal className="size-4" aria-hidden />
          Filters{active ? ` (${active})` : ""}
          <ChevronDown className={cn("size-4 transition-transform md:hidden", isOpen && "rotate-180")} aria-hidden />
        </button>
        <p className="text-[10px] uppercase tracking-widest text-dim" aria-live="polite">
          {resultCount} of {totalCount} shown
        </p>
        {active ? (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto inline-flex min-h-[44px] items-center gap-1 border border-myco-accent/40 px-3 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:bg-myco-accent/10 touch-manipulation"
          >
            <X className="size-3.5" aria-hidden /> Clear filters
          </button>
        ) : null}
      </div>

      <div id="tissue-filter-groups" className={cn("mt-2", isOpen ? "block" : "hidden", "md:block")}>
        <p className="mb-3 text-[10px] text-dim">{basisNote}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => {
            const picked = selection[group.id] ?? [];
            const isExpanded = expanded[group.id] ?? false;
            const visible = isExpanded ? group.options : group.options.slice(0, COLLAPSED_OPTIONS);
            const hidden = group.options.length - visible.length;
            return (
              <fieldset key={group.id} className="min-w-0">
                <legend
                  className={cn(
                    "mb-1.5 text-[10px] font-black uppercase tracking-[0.2em]",
                    isLight ? "text-stone-600" : "text-white/60",
                  )}
                >
                  {group.label}
                </legend>
                {group.note ? <p className="mb-1.5 text-[10px] text-amber-300/80">{group.note}</p> : null}
                <div className="flex flex-wrap gap-1.5">
                  {visible.map((option) => {
                    const isActive = picked.includes(option.value);
                    const isEmpty = option.count === 0 && !isActive;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={isActive}
                        disabled={group.isDisabled || isEmpty}
                        onClick={() => onToggle(group.id, option.value)}
                        className={cn(
                          "inline-flex min-h-[44px] items-center gap-1.5 border px-3 text-[10px] font-bold uppercase tracking-widest touch-manipulation transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                          isActive
                            ? "border-myco-accent bg-myco-accent/15 text-myco-accent"
                            : isLight
                              ? "border-black/15 text-stone-600 hover:text-stone-900"
                              : "border-white/15 text-dim hover:text-white",
                        )}
                      >
                        <span className="normal-case tracking-normal">{option.label}</span>
                        <span className="tabular-nums opacity-70">{option.count}</span>
                      </button>
                    );
                  })}
                  {hidden > 0 || isExpanded ? (
                    <button
                      type="button"
                      onClick={() => setExpanded((prev) => ({ ...prev, [group.id]: !isExpanded }))}
                      className="inline-flex min-h-[44px] items-center px-2 text-[10px] font-bold uppercase tracking-widest text-myco-accent hover:underline touch-manipulation"
                    >
                      {isExpanded ? "Show fewer" : `+${hidden} more`}
                    </button>
                  ) : null}
                </div>
              </fieldset>
            );
          })}
        </div>
      </div>
    </section>
  );
}
