"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import type { LiveTotals, ReviewMode } from "./types";

function fmt(v: number, dp = 0): string {
  return dp === 0 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}

export function ReviewFooter({
  totals,
  unreviewedCount,
  keptCount,
  mode,
  busy,
  error,
  onSave,
  onSavePlan,
  onDelete,
}: {
  totals: LiveTotals;
  unreviewedCount: number;
  keptCount: number;
  mode: ReviewMode;
  busy: boolean;
  error: string | null;
  onSave: () => void;
  onSavePlan?: () => void;
  onDelete?: () => void;
}) {
  const [pulse, setPulse] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const gated = unreviewedCount > 0 || keptCount === 0;
  const saveLabel =
    mode === "conversion" ? "Log it" : busy ? "Saving…" : "Save";
  const gateLabel =
    keptCount === 0
      ? "All items removed. Delete the meal instead?"
      : `Review ${unreviewedCount} more ${unreviewedCount === 1 ? "item" : "items"}`;

  function handleSave() {
    if (gated) {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
      return;
    }
    onSave();
  }

  return (
    <footer className="safe-bottom sticky bottom-0 z-20 -mx-4 border-t border-line bg-surface/95 px-4 pb-4 pt-3 backdrop-blur">
      <div className="tnum mb-3 flex items-baseline justify-between">
        <span className="text-lg font-bold">{fmt(totals.kcal)} kcal</span>
        <span className="text-xs text-muted">
          <span className="text-protein">P {fmt(totals.protein, 1)}</span>
          {" · "}
          <span className="text-carbs">C {fmt(totals.carbs, 1)}</span>
          {" · "}
          <span className="text-fat">F {fmt(totals.fat, 1)}</span>
          {" · "}
          <span className="text-fibre">Fb {fmt(totals.fibre, 1)}</span>
        </span>
      </div>
      {error && <p className="mb-2 text-sm text-danger">{error}</p>}
      <div className={pulse ? "pulse-once" : ""}>
        <Button full onClick={handleSave} disabled={busy} aria-disabled={gated}>
          {gated ? gateLabel : busy ? "Saving…" : saveLabel}
        </Button>
      </div>
      {(mode === "conversion" || (mode === "edit" && onDelete)) && (
        <div className="mt-2 flex gap-2">
          {mode === "conversion" && onSavePlan && (
            <Button variant="secondary" full onClick={onSavePlan} disabled={busy}>
              Save plan
            </Button>
          )}
          {onDelete &&
            (confirmDelete ? (
              <Button variant="danger" full onClick={onDelete} disabled={busy}>
                {mode === "conversion" ? "Really delete plan?" : "Really delete meal?"}
              </Button>
            ) : (
              <Button
                variant="secondary"
                full
                className="text-danger"
                onClick={() => setConfirmDelete(true)}
                disabled={busy}
              >
                {mode === "conversion" ? "Delete plan" : "Delete meal"}
              </Button>
            ))}
        </div>
      )}
    </footer>
  );
}
