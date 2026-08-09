"use client";

import { formatShort } from "@/lib/dates";
import type { PreviewRow } from "./types";

/** Step 3 list: estimate progress and per-row outcome before committing. */
export function EstimateStep({
  rows,
  progress,
}: {
  rows: PreviewRow[];
  progress: { current: number; total: number } | null;
}) {
  return (
    <div className="space-y-3">
      {progress && progress.total > 0 && (
        <p className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary">
          Estimating {Math.min(progress.current, progress.total)} of {progress.total}…
        </p>
      )}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.index} className="rounded-2xl border border-line bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate font-semibold">{row.name}</p>
              {row.estimate === "failed" ? (
                <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-amber-ink">
                  No estimate
                </span>
              ) : row.estimate ? (
                <span className="tnum shrink-0 text-sm font-semibold">
                  ~{Math.round(row.estimate.kcal)} kcal
                </span>
              ) : row.kcal !== null ? (
                <span className="tnum shrink-0 text-sm font-semibold">
                  {Math.round(row.kcal)} kcal
                </span>
              ) : (
                <span className="shrink-0 text-xs text-muted">Waiting…</span>
              )}
            </div>
            <p className="text-sm text-muted">
              {row.date ? formatShort(row.date) : "No date"}
              {row.estimate === "failed" && " · You can still import it and enter values when logging."}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
