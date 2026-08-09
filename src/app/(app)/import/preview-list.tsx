"use client";

import { formatShort } from "@/lib/dates";
import type { PreviewRow } from "./types";

function flag(text: string, tone: "amber" | "muted" | "primary") {
  const styles = {
    amber: "bg-amber-soft text-amber-ink",
    muted: "bg-surface2 text-muted",
    primary: "bg-primary-soft text-primary",
  } as const;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[tone]}`}>
      {text}
    </span>
  );
}

/** Preview rendered as stacked mobile rows for one-handed use. */
export function PreviewList({
  rows,
  plannedDates,
  onToggle,
}: {
  rows: PreviewRow[];
  plannedDates: string[];
  onToggle: (index: number) => void;
}) {
  const lastIncludedForDate = new Map<string, number>();
  for (const row of rows) {
    if (row.included && row.date) lastIncludedForDate.set(row.date, row.index);
  }

  return (
    <div className="space-y-2">
      {rows.map((row) => {
        const duplicateLoser =
          row.date !== null &&
          rows.some((other) => other.date === row.date && other.index !== row.index);
        return (
          <button
            key={row.index}
            type="button"
            onClick={() => onToggle(row.index)}
            className={`w-full rounded-2xl border p-3 text-left ${
              row.included ? "border-line bg-surface" : "border-dashed border-line bg-surface2/50 opacity-60"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{row.name}</p>
              <span
                className={`shrink-0 text-xs font-semibold ${row.included ? "text-primary" : "text-muted"}`}
              >
                {row.included ? "Included" : "Skipped"}
              </span>
            </div>
            <p className="tnum mt-0.5 text-sm text-muted">
              {row.date ? formatShort(row.date) : "No date"}
              {row.kcal !== null && ` · ${Math.round(row.kcal)} kcal`}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {row.date === null && flag("Check date", "amber")}
              {row.kcal === null && flag("Will estimate", "primary")}
              {row.date !== null &&
                plannedDates.includes(row.date) &&
                flag("Replaces existing plan", "muted")}
              {duplicateLoser &&
                row.date !== null &&
                flag(
                  row.included && lastIncludedForDate.get(row.date) === row.index
                    ? `2 rows for ${formatShort(row.date)}, keeping this one`
                    : `2 rows for ${formatShort(row.date)}, keeping the last`,
                  "amber"
                )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
