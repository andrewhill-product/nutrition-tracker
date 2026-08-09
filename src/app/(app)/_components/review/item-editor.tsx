"use client";

import { Button } from "../ui/button";
import { Stepper } from "../ui/stepper";
import { MacroField } from "./macro-field";
import { scaleFinals, type MacroKey, type ReviewItem } from "./types";

const MACROS: { key: Exclude<MacroKey, "kcal">; label: string }[] = [
  { key: "protein", label: "Protein" },
  { key: "carbs", label: "Carbs" },
  { key: "fat", label: "Fat" },
  { key: "fibre", label: "Fibre" },
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
  const canScale = item.ai.grams !== null && item.ai.grams > 0;
  const valid = item.final.grams !== null && item.final.kcal !== null;

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
      {!valid && (
        <p className="text-sm text-danger">Enter grams and calories to continue.</p>
      )}
      <Button variant="secondary" full disabled={!valid} onClick={onDone}>
        Done
      </Button>
    </div>
  );
}
