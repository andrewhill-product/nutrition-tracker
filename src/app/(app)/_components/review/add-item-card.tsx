"use client";

import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import type { AnalysisResultT } from "@/lib/schemas";
import { Button } from "../ui/button";
import { itemFromAnalysis, nextKey, type ReviewItem } from "./types";

/**
 * Add an item by name and grams, then either estimate macros through the text
 * analyse endpoint (result still needs a verdict) or enter values manually.
 */
export function AddItemCard({
  onAdd,
  startOpen = false,
}: {
  onAdd: (item: ReviewItem) => void;
  startOpen?: boolean;
}) {
  const [open, setOpen] = useState(startOpen);
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [manual, setManual] = useState(false);
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fibre, setFibre] = useState("");
  const [sugar, setSugar] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setName("");
    setGrams("");
    setKcal("");
    setProtein("");
    setCarbs("");
    setFat("");
    setFibre("");
    setSugar("");
    setManual(false);
    setError(null);
  }

  const gramsNum = Number(grams);
  const canSubmit = name.trim().length > 0 && gramsNum > 0;

  async function estimate() {
    if (!canSubmit || busy) return;
    setBusy(true);
    setError(null);
    const res = await fetchJson<AnalysisResultT>("/api/analyse", {
      method: "POST",
      body: JSON.stringify({
        mode: "text",
        description: `${gramsNum}g of ${name.trim()}`,
      }),
    });
    setBusy(false);
    if (!res.ok || res.data.items.length === 0) {
      setError("Could not estimate that. Try again or enter the values yourself.");
      return;
    }
    const item = itemFromAnalysis(res.data.items[0]);
    onAdd({ ...item, name: name.trim() });
    reset();
    setOpen(false);
  }

  function addManual() {
    const kcalNum = Number(kcal);
    if (!canSubmit || !(kcalNum >= 0) || kcal === "") {
      setError("Enter at least a name, grams and calories.");
      return;
    }
    const num = (s: string) => (s === "" ? null : Math.max(0, Number(s) || 0));
    onAdd({
      key: nextKey(),
      name: name.trim(),
      ai: {
        portionDesc: null,
        grams: null,
        kcal: null,
        protein: null,
        carbs: null,
        fat: null,
        fibre: null,
        sugar: null,
        confidence: null,
      },
      // A manual entry is the human's own numbers: verdict "edited".
      verdict: "edited",
      final: {
        grams: gramsNum,
        kcal: Math.round(kcalNum),
        protein: num(protein),
        carbs: num(carbs),
        fat: num(fat),
        fibre: num(fibre),
        sugar: num(sugar),
      },
      overridden: {},
    });
    reset();
    setOpen(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm font-semibold text-muted"
      >
        + Add an item
      </button>
    );
  }

  const input =
    "h-11 w-full rounded-lg border border-line bg-surface px-3 outline-none focus:border-primary";

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <p className="font-semibold">Add an item</p>
      <input
        className={input}
        placeholder="Food name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={input}
        type="number"
        inputMode="numeric"
        min={1}
        placeholder="Grams"
        value={grams}
        onChange={(e) => setGrams(e.target.value)}
      />
      {manual && (
        <div className="grid grid-cols-2 gap-2">
          <input className={input} type="number" inputMode="numeric" min={0} placeholder="kcal" value={kcal} onChange={(e) => setKcal(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min={0} placeholder="Protein g" value={protein} onChange={(e) => setProtein(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min={0} placeholder="Carbs g" value={carbs} onChange={(e) => setCarbs(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min={0} placeholder="Fat g" value={fat} onChange={(e) => setFat(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min={0} placeholder="Fibre g" value={fibre} onChange={(e) => setFibre(e.target.value)} />
          <input className={input} type="number" inputMode="decimal" min={0} placeholder="Sugar g" value={sugar} onChange={(e) => setSugar(e.target.value)} />
        </div>
      )}
      {error && <p className="text-sm text-danger">{error}</p>}
      {manual ? (
        <Button full onClick={addManual} disabled={!canSubmit}>
          Add item
        </Button>
      ) : (
        <Button full onClick={estimate} disabled={!canSubmit || busy}>
          {busy ? "Estimating…" : "Estimate macros"}
        </Button>
      )}
      <div className="flex justify-between">
        <button
          type="button"
          onClick={() => setManual((m) => !m)}
          className="h-11 px-2 text-sm font-semibold text-primary"
        >
          {manual ? "Estimate instead" : "Enter values myself"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="h-11 px-2 text-sm font-semibold text-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
