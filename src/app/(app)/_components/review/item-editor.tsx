"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { AnalysisResultT } from "@/lib/schemas";
import { Button } from "../ui/button";
import { Chip } from "../ui/chip";
import { Stepper } from "../ui/stepper";
import { MacroField } from "./macro-field";
import { scaleFinals, type MacroKey, type ReviewItem } from "./types";

type SuggestSize = "small" | "medium" | "large";
const SIZES: { value: SuggestSize; label: string }[] = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

// One-shot scale factors relative to the AI portion estimate.
const SCALES: { factor: number; label: string }[] = [
  { factor: 0.5, label: "×½" },
  { factor: 0.75, label: "×¾" },
  { factor: 1.5, label: "×1½" },
  { factor: 2, label: "×2" },
];

const MACROS: { key: Exclude<MacroKey, "kcal">; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
  { key: "fibre", label: "Fibre" },
  { key: "sugar", label: "Sugar" },
];

/**
 * Expanded editor: grams stepper plus macro fields. Macros scale linearly with
 * grams from the AI baseline until individually overridden.
 */
export function ItemEditor({
  item,
  onChange,
  onDone,
}: {
  item: ReviewItem;
  onChange: (item: ReviewItem) => void;
  onDone: () => void;
}) {
  const [size, setSize] = useState<SuggestSize | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestError, setSuggestError] = useState<string | null>(null);
  const canScale = item.ai.grams !== null && item.ai.grams > 0;
  const valid = item.final.grams !== null && item.final.kcal !== null;

  /**
   * Re-estimate this item from its (possibly renamed) name, with an optional
   * size for accuracy. The result becomes the item's new AI estimate, so
   * Accept, scaling and calibration all work as for a fresh analysis.
   */
  async function suggestFromName() {
    const name = item.name.trim();
    if (!name || suggesting) return;
    setSuggesting(true);
    setSuggestError(null);
    const res = await fetchJson<AnalysisResultT>("/api/analyse", {
      method: "POST",
      body: JSON.stringify({
        mode: "text",
        description: size ? `a ${size} ${name}` : `a typical ${name}`,
      }),
    });
    setSuggesting(false);
    if (!res.ok || res.data.items.length === 0) {
      setSuggestError("Could not suggest values. Try again or enter them yourself.");
      return;
    }
    const s = res.data.items[0];
    onChange({
      ...item,
      unit: s.unit ?? null,
      ai: {
        portionDesc: s.portion_desc,
        count: s.count ?? null,
        grams: s.grams,
        kcal: s.kcal,
        protein: s.protein_g,
        carbs: s.carbs_g,
        fat: s.fat_g,
        fibre: s.fibre_g,
        sugar: s.sugar_g,
        confidence: s.confidence,
      },
      final: {
        count: s.count ?? null,
        grams: s.grams,
        kcal: s.kcal,
        protein: s.protein_g,
        carbs: s.carbs_g,
        fat: s.fat_g,
        fibre: s.fibre_g,
        sugar: s.sugar_g,
      },
      overridden: {},
    });
  }

  function setGrams(grams: number) {
    onChange({ ...item, final: scaleFinals(item, grams) });
  }

  function setMacro(key: MacroKey, value: number | null) {
    onChange({
      ...item,
      final: { ...item.final, [key]: value },
      overridden: { ...item.overridden, [key]: true },
    });
  }

  function resetMacro(key: MacroKey) {
    const overridden = { ...item.overridden, [key]: false };
    const cleared = { ...item, overridden };
    onChange({
      ...cleared,
      final: scaleFinals(cleared, item.final.grams ?? item.ai.grams ?? 0),
    });
  }

  return (
    <div className="space-y-3 border-t border-line pt-3">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted">Portion</span>
        <Stepper
          value={item.final.grams ?? item.ai.grams ?? 0}
          onChange={setGrams}
          step={5}
          unit="g"
        />
      </div>
      {canScale && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Scale</span>
          <div className="flex flex-1 gap-2">
            {SCALES.map((s) => {
              const target = Math.round(item.ai.grams! * s.factor);
              return (
                <Chip
                  key={s.factor}
                  selected={item.final.grams === target}
                  onClick={() =>
                    setGrams(item.final.grams === target ? item.ai.grams! : target)
                  }
                  className="h-9 flex-1 px-0 text-xs"
                >
                  {s.label}
                </Chip>
              );
            })}
          </div>
        </div>
      )}
      <div className="divide-y divide-line rounded-xl bg-surface2/50 px-3">
        <MacroField
          label="Calories"
          unit="kcal"
          integer
          value={item.final.kcal}
          overridden={!!item.overridden.kcal}
          canReset={canScale && item.ai.kcal !== null}
          onChange={(v) => setMacro("kcal", v === null ? null : Math.round(v))}
          onReset={() => resetMacro("kcal")}
        />
        {MACROS.map((m) => (
          <MacroField
            key={m.key}
            label={m.label}
            unit="g"
            value={item.final[m.key]}
            overridden={!!item.overridden[m.key]}
            canReset={canScale && item.ai[m.key] !== null}
            onChange={(v) => setMacro(m.key, v)}
            onReset={() => resetMacro(m.key)}
          />
        ))}
      </div>
      <div className="space-y-2 rounded-xl border border-dashed border-line p-3">
        <p className="text-sm text-muted">
          Wrong item? Rename it above, say how big it was, and get fresh values.
        </p>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <Chip
              key={s.value}
              selected={size === s.value}
              onClick={() => setSize(size === s.value ? null : s.value)}
              className="h-9 flex-1 text-xs"
            >
              {s.label}
            </Chip>
          ))}
        </div>
        {suggestError && <p className="text-sm text-danger">{suggestError}</p>}
        <Button
          variant="secondary"
          full
          onClick={suggestFromName}
          disabled={suggesting || item.name.trim().length === 0}
        >
          {suggesting ? "Suggesting…" : "Suggest values from name"}
        </Button>
      </div>
      {!valid && (
        <p className="text-sm text-danger">Enter grams and calories to continue.</p>
      )}
      <Button variant="secondary" full disabled={!valid} onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
