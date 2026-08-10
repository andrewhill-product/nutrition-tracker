"use client";

import { useState } from "react";
import type { AnalysisItemT, AnalysisResultT } from "@/lib/schemas";
import { Button } from "../ui/button";

function MacroLine({ item }: { item: AnalysisItemT }) {
  return (
    <p className="text-xs text-muted">
      {item.portion_desc && <>{item.portion_desc}, </>}
      protein {item.protein_g}g, carbs {item.carbs_g}g, fat {item.fat_g}g
    </p>
  );
}

/**
 * Interstitial between a photo analysis and the review screen: what Claude
 * found, with per-item nutrient breakdowns, plus a box to add anything the
 * photo missed. Additions are estimated by the same analyse endpoint in text
 * mode, so they arrive with full nutrients and count as real AI estimates.
 * Everything still goes through the review gate next; nothing saves here.
 */
export function AdditionsCard({
  analysis,
  additions,
  adding,
  error,
  onAdd,
  onRemoveAddition,
  onContinue,
  onCancel,
}: {
  analysis: AnalysisResultT;
  additions: AnalysisItemT[];
  adding: boolean;
  error: string | null;
  onAdd: (text: string) => Promise<boolean>;
  onRemoveAddition: (index: number) => void;
  onContinue: () => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");

  const totalKcal =
    analysis.items.reduce((s, i) => s + i.kcal, 0) +
    additions.reduce((s, i) => s + i.kcal, 0);

  async function add() {
    const trimmed = text.trim();
    if (trimmed === "" || adding) return;
    const ok = await onAdd(trimmed);
    if (ok) setText("");
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{analysis.meal_name || "Meal"}</h2>
        <p className="text-sm text-muted">
          Claude found {analysis.items.length}{" "}
          {analysis.items.length === 1 ? "item" : "items"}. Add anything the
          photo missed before you review.
        </p>
      </div>

      <div className="space-y-2 rounded-2xl border border-line bg-surface p-4">
        {analysis.items.map((item, i) => (
          <div
            key={`found-${i}`}
            className="flex items-start justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <MacroLine item={item} />
            </div>
            <span className="tnum shrink-0 text-sm font-semibold">
              {item.kcal} kcal
            </span>
          </div>
        ))}
        {additions.map((item, i) => (
          <div
            key={`added-${i}`}
            className="flex items-start justify-between gap-2 border-t border-dashed border-line pt-2"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {item.name} <span className="text-xs text-primary">added</span>
              </p>
              <MacroLine item={item} />
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="tnum text-sm font-semibold">{item.kcal} kcal</span>
              <button
                type="button"
                aria-label={`Remove ${item.name}`}
                onClick={() => onRemoveAddition(i)}
                className="flex h-6 w-6 items-center justify-center rounded-full bg-surface2 text-muted"
              >
                &times;
              </button>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-line pt-2 text-sm">
          <span className="font-medium">Total</span>
          <span className="tnum font-bold">{totalKcal} kcal</span>
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="additions-input" className="text-sm font-medium">
          Anything the photo missed?
        </label>
        <textarea
          id="additions-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          placeholder="e.g. buttered toast on the side, glass of orange juice"
          className="w-full rounded-xl border border-line bg-surface p-3 text-base"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button
          variant="secondary"
          full
          onClick={add}
          disabled={adding || text.trim() === ""}
        >
          {adding ? "Estimating…" : "Estimate and add"}
        </Button>
      </div>

      <div className="space-y-2">
        <Button full onClick={onContinue} disabled={adding}>
          Continue to review
        </Button>
        <Button variant="ghost" full onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
