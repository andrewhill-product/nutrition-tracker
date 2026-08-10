"use client";

import { useState } from "react";
import { ItemEditor } from "./item-editor";
import { RemovedItemRow } from "./removed-item-row";
import { scaleFinals, type ReviewItem } from "./types";

function fmt(v: number | null, dp = 0): string {
  if (v === null) return "?";
  return dp === 0 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
}

/** One reviewable item: values, low-confidence badge, verdict bar. */
export function ItemCard({
  item,
  onChange,
}: {
  item: ReviewItem;
  onChange: (item: ReviewItem) => void;
}) {
  const [editing, setEditing] = useState(
    // No-estimate items open straight in edit: there is nothing to accept.
    item.verdict === null && item.ai.kcal === null
  );

  if (item.verdict === "removed") {
    return (
      <RemovedItemRow
        item={item}
        onUndo={() => onChange({ ...item, verdict: null })}
      />
    );
  }

  const lowConfidence =
    item.ai.confidence !== null && item.ai.confidence < 0.6;
  const canAccept = item.ai.kcal !== null;
  const accepted = item.verdict === "up";
  const edited = item.verdict === "edited";

  function accept() {
    if (!canAccept) return;
    if (accepted) {
      onChange({ ...item, verdict: null });
      return;
    }
    onChange({
      ...item,
      verdict: "up",
      final: {
        grams: item.ai.grams,
        kcal: item.ai.kcal,
        protein: item.ai.protein,
        carbs: item.ai.carbs,
        fat: item.ai.fat,
        fibre: item.ai.fibre,
        sugar: item.ai.sugar,
      },
      overridden: {},
    });
    setEditing(false);
  }

  function openEdit() {
    setEditing(true);
    if (item.final.grams === null && item.ai.grams !== null) {
      onChange({ ...item, final: scaleFinals(item, item.ai.grams) });
    }
  }

  function doneEditing() {
    setEditing(false);
    onChange({ ...item, verdict: "edited" });
  }

  function remove() {
    setEditing(false);
    onChange({ ...item, verdict: "removed" });
  }

  const verdictBtn =
    "flex h-11 flex-1 items-center justify-center gap-1 rounded-xl text-sm font-semibold transition";

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={item.name}
              onChange={(e) => onChange({ ...item, name: e.target.value })}
              aria-label="Item name"
              className="h-9 w-full min-w-0 rounded-lg border border-transparent bg-transparent font-semibold outline-none focus:border-line focus:bg-surface2/50 focus:px-2"
            />
            {lowConfidence && (
              <span className="shrink-0 rounded-full bg-amber-soft px-2 py-0.5 text-[11px] font-medium text-amber-ink">
                Low confidence
              </span>
            )}
          </div>
          {item.ai.portionDesc && (
            <p className="text-sm text-muted">{item.ai.portionDesc}</p>
          )}
        </div>
        <p className="tnum shrink-0 text-right font-semibold">
          {fmt(item.final.kcal)} kcal
          <span className="block text-xs font-normal text-muted">
            {fmt(item.final.grams)}g
          </span>
        </p>
      </div>
      <p className="tnum text-sm text-muted">
        <span className="text-protein">P {fmt(item.final.protein, 1)}g</span>
        {" · "}
        <span className="text-carbs">C {fmt(item.final.carbs, 1)}g</span>
        {" · "}
        <span className="text-fat">F {fmt(item.final.fat, 1)}g</span>
        {" · "}
        <span className="text-fibre">Fb {fmt(item.final.fibre, 1)}g</span>
        {" · "}
        <span className="text-sugar">Su {fmt(item.final.sugar, 1)}g</span>
      </p>

      {editing ? (
        <ItemEditor item={item} onChange={onChange} onDone={doneEditing} />
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={accept}
            disabled={!canAccept}
            className={`${verdictBtn} ${
              accepted
                ? "bg-fibre/15 text-fibre ring-1 ring-fibre"
                : "bg-surface2 text-ink disabled:opacity-40"
            }`}
          >
            👍 Accept
          </button>
          <button
            type="button"
            onClick={openEdit}
            className={`${verdictBtn} ${
              edited
                ? "bg-primary-soft text-primary ring-1 ring-primary"
                : "bg-surface2 text-ink"
            }`}
          >
            ✏️ Edit
          </button>
          <button
            type="button"
            onClick={remove}
            className={`${verdictBtn} bg-surface2 text-ink`}
          >
            🗑 Remove
          </button>
        </div>
      )}
    </div>
  );
}
