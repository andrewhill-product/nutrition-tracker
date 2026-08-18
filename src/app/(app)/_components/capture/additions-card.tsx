"use client";

import { useState } from "react";
import type { AnalysisItemT, AnalysisResultT } from "@/lib/schemas";
import { Button } from "../ui/button";

/** An ingredient Andrew typed in, estimated by the same analyse endpoint. */
export type AdditionEntry = { key: number; item: AnalysisItemT };

/** What Andrew decided about one ingredient before the review screen. */
export type IngredientDecision = {
  item: AnalysisItemT;
  included: boolean;
  /** Count for countable items, grams otherwise. */
  qty: number;
  isCount: boolean;
};

type RowState = { included: boolean; qty: number };

function isCountable(item: AnalysisItemT): boolean {
  return item.unit != null && item.count != null && item.count > 0;
}

function defaultQty(item: AnalysisItemT): number {
  return isCountable(item) ? (item.count as number) : item.grams;
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

function QtyControl({
  qty,
  isCount,
  onChange,
}: {
  qty: number;
  isCount: boolean;
  onChange: (v: number) => void;
}) {
  const step = isCount ? 1 : 10;
  const min = isCount ? 0.5 : 5;
  const max = isCount ? 50 : 3000;
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full bg-surface2 text-lg font-semibold select-none";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button
        type="button"
        aria-label="Less"
        className={btn}
        onClick={() => onChange(round1(Math.max(min, qty - step)))}
      >
        −
      </button>
      <span className="tnum min-w-11 text-center text-sm font-semibold">
        {qty}
        {isCount ? "" : "g"}
      </span>
      <button
        type="button"
        aria-label="More"
        className={btn}
        onClick={() => onChange(round1(Math.min(max, qty + step)))}
      >
        +
      </button>
    </div>
  );
}

/**
 * Ingredient checklist between a photo analysis and the review screen: every
 * ingredient Claude saw, ticked by default, with an adjustable quantity, plus
 * a box to add anything the photo missed (estimated by the same analyse
 * endpoint, so additions arrive with full nutrients and count as real AI
 * estimates). Nutrient-level adjusting stays on the review screen; unticked
 * ingredients arrive there pre-marked removed and quantity changes pre-marked
 * as edits, so nothing is saved without the review gate.
 */
export function AdditionsCard({
  analysis,
  additions,
  adding,
  error,
  onAdd,
  onContinue,
  onCancel,
}: {
  analysis: AnalysisResultT;
  additions: AdditionEntry[];
  adding: boolean;
  error: string | null;
  onAdd: (text: string) => Promise<boolean>;
  onContinue: (decisions: IngredientDecision[]) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState("");
  const [rowState, setRowState] = useState<Record<string, RowState>>({});

  const rows: { rowKey: string; item: AnalysisItemT; added: boolean }[] = [
    ...analysis.items.map((item, i) => ({
      rowKey: `f${i}`,
      item,
      added: false,
    })),
    ...additions.map((e) => ({ rowKey: `a${e.key}`, item: e.item, added: true })),
  ];

  function stateFor(rowKey: string, item: AnalysisItemT): RowState {
    return rowState[rowKey] ?? { included: true, qty: defaultQty(item) };
  }

  function patchRow(rowKey: string, item: AnalysisItemT, patch: Partial<RowState>) {
    setRowState((prev) => ({
      ...prev,
      [rowKey]: { ...stateFor(rowKey, item), ...patch },
    }));
  }

  function scaledKcal(item: AnalysisItemT, qty: number): number {
    const base = defaultQty(item);
    return base > 0 ? Math.round(item.kcal * (qty / base)) : item.kcal;
  }

  const totalKcal = rows.reduce((sum, r) => {
    const st = stateFor(r.rowKey, r.item);
    return st.included ? sum + scaledKcal(r.item, st.qty) : sum;
  }, 0);

  async function add() {
    const trimmed = text.trim();
    if (trimmed === "" || adding) return;
    const ok = await onAdd(trimmed);
    if (ok) setText("");
  }

  function continueToReview() {
    onContinue(
      rows.map((r) => {
        const st = stateFor(r.rowKey, r.item);
        return {
          item: r.item,
          included: st.included,
          qty: st.qty,
          isCount: isCountable(r.item),
        };
      })
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{analysis.meal_name || "Meal"}</h2>
        <p className="text-sm text-muted">
          Here is what Claude saw. Untick anything that is wrong, adjust the
          quantities, and add anything the photo missed. Nutrients come next.
        </p>
      </div>

      <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
        {rows.map((r) => {
          const st = stateFor(r.rowKey, r.item);
          const countable = isCountable(r.item);
          return (
            <div key={r.rowKey} className="flex items-center gap-3">
              <button
                type="button"
                role="checkbox"
                aria-checked={st.included}
                aria-label={`Include ${r.item.name}`}
                onClick={() => patchRow(r.rowKey, r.item, { included: !st.included })}
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border text-sm font-bold transition ${
                  st.included
                    ? "border-primary bg-primary text-on-primary"
                    : "border-line bg-surface text-transparent"
                }`}
              >
                ✓
              </button>
              <div className="min-w-0 flex-1">
                <p
                  className={`truncate text-sm font-medium ${
                    st.included ? "" : "text-muted line-through"
                  }`}
                >
                  {r.item.name}
                  {r.added && (
                    <span className="ml-1 text-xs text-primary">added</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted">
                  {r.item.portion_desc && <>{r.item.portion_desc}, </>}
                  {scaledKcal(r.item, st.qty)} kcal
                </p>
              </div>
              {st.included && (
                <QtyControl
                  qty={st.qty}
                  isCount={countable}
                  onChange={(v) => patchRow(r.rowKey, r.item, { qty: v })}
                />
              )}
            </div>
          );
        })}
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
        <Button full onClick={continueToReview} disabled={adding}>
          Continue to review
        </Button>
        <Button variant="ghost" full onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
