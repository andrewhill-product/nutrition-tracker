"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Button } from "../_components/ui/button";
import { Stepper } from "../_components/ui/stepper";

type TargetsValue = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
};

const ROWS: { key: keyof TargetsValue; label: string; step: number; unit: string }[] = [
  { key: "kcal", label: "Calories", step: 50, unit: "kcal" },
  { key: "protein_g", label: "Protein", step: 5, unit: "g" },
  { key: "carbs_g", label: "Carbs", step: 5, unit: "g" },
  { key: "fat_g", label: "Fat", step: 5, unit: "g" },
  { key: "fibre_g", label: "Fibre", step: 1, unit: "g" },
];

export function TargetsForm({ initial }: { initial: TargetsValue }) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  async function save() {
    setBusy(true);
    setMessage(null);
    const res = await fetchJson("/api/targets", {
      method: "PUT",
      body: JSON.stringify(values),
    });
    setBusy(false);
    setMessage(res.ok ? "Targets saved." : res.error);
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Daily targets</h2>
      {ROWS.map((row) => (
        <div key={row.key} className="flex items-center justify-between gap-2">
          <span className="text-sm">{row.label}</span>
          <Stepper
            value={values[row.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [row.key]: v }))}
            step={row.step}
            min={0}
            max={20000}
            unit={row.unit}
          />
        </div>
      ))}
      {message && (
        <p className={`text-sm ${message === "Targets saved." ? "text-fibre" : "text-danger"}`}>
          {message}
        </p>
      )}
      <div className="sticky bottom-16">
        <Button full onClick={save} disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save targets"}
        </Button>
      </div>
    </div>
  );
}
