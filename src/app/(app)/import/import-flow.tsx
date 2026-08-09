"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { detectColumns, type ColumnMap } from "@/lib/import/detect";
import type { AnalysisResultT } from "@/lib/schemas";
import { Button } from "../_components/ui/button";
import { ConfirmFooter } from "./confirm-footer";
import { EstimateStep } from "./estimate-step";
import { FileStep } from "./file-step";
import { MappingChips } from "./mapping-chips";
import { PreviewList } from "./preview-list";
import {
  buildRows,
  committedRows,
  type Estimate,
  type PreviewRow,
  type SheetData,
} from "./types";

type Step = "file" | "check" | "confirm";

export function ImportFlow({ plannedDates }: { plannedDates: string[] }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("file");
  const [sheet, setSheet] = useState<SheetData | null>(null);
  const [map, setMap] = useState<ColumnMap>({});
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [showMapping, setShowMapping] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const estimatingRef = useRef(false);
  // Bumped whenever rows are rebuilt so an in-flight estimation loop cannot
  // patch stale estimates into rows built from a different mapping or file.
  const rowsGeneration = useRef(0);

  function handleParsed(parsed: SheetData) {
    const detected = detectColumns(parsed.headers, parsed.rows);
    rowsGeneration.current += 1;
    setSheet(parsed);
    setMap(detected);
    setRows(buildRows(parsed, detected));
    setStep("check");
  }

  function handleMapChange(next: ColumnMap) {
    setMap(next);
    if (sheet) {
      rowsGeneration.current += 1;
      setRows(buildRows(sheet, next));
    }
  }

  function toggleRow(index: number) {
    setRows((prev) => {
      const target = prev.find((r) => r.index === index);
      if (!target) return prev;
      const including = !target.included;
      return prev.map((row) => {
        if (row.index === index) return { ...row, included: including };
        // One dinner per date: including a row excludes its duplicates.
        if (including && row.date !== null && row.date === target.date) {
          return { ...row, included: false };
        }
        return row;
      });
    });
  }

  const commitList = committedRows(rows);
  const toEstimate = commitList.filter((r) => r.kcal === null && r.estimate === null);

  async function startEstimates() {
    setStep("confirm");
    if (estimatingRef.current) return;
    estimatingRef.current = true;
    const generation = rowsGeneration.current;
    const pending = toEstimate;
    setProgress(pending.length > 0 ? { current: 1, total: pending.length } : null);
    for (let i = 0; i < pending.length; i++) {
      if (rowsGeneration.current !== generation) break;
      setProgress({ current: i + 1, total: pending.length });
      const row = pending[i];
      const res = await fetchJson<AnalysisResultT>("/api/analyse", {
        method: "POST",
        body: JSON.stringify({ mode: "text", description: row.name }),
      });
      let estimate: Estimate | "failed" = "failed";
      if (res.ok && res.data.items.length > 0) {
        const items = res.data.items;
        const sum = (pick: (i: (typeof items)[0]) => number) =>
          items.reduce((total, item) => total + pick(item), 0);
        estimate = {
          grams: Math.round(sum((i) => i.grams)) || null,
          portionDesc: items.map((i) => `${i.name} ${i.grams}g`).join(", ").slice(0, 200),
          kcal: Math.round(sum((i) => i.kcal)),
          protein: sum((i) => i.protein_g),
          carbs: sum((i) => i.carbs_g),
          fat: sum((i) => i.fat_g),
          fibre: sum((i) => i.fibre_g),
          confidence: Math.min(...items.map((i) => i.confidence)),
        };
      }
      if (rowsGeneration.current !== generation) break;
      setRows((prev) =>
        prev.map((r) => (r.index === row.index ? { ...r, estimate } : r))
      );
    }
    setProgress(null);
    estimatingRef.current = false;
  }

  async function commit() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const payload = commitList.map((row) => {
      const est = row.estimate !== "failed" ? row.estimate : null;
      return {
        date: row.date!,
        name: row.name,
        grams: est?.grams ?? null,
        portion_desc: est?.portionDesc ?? null,
        kcal: row.kcal !== null ? Math.round(row.kcal) : (est?.kcal ?? null),
        protein_g: row.protein ?? est?.protein ?? null,
        carbs_g: row.carbs ?? est?.carbs ?? null,
        fat_g: row.fat ?? est?.fat ?? null,
        fibre_g: row.fibre ?? est?.fibre ?? null,
        // AI provenance only when the estimate step produced the numbers.
        ai_confidence: row.kcal === null && est ? est.confidence : null,
      };
    });
    const res = await fetchJson<{ imported: number }>("/api/import/commit", {
      method: "POST",
      body: JSON.stringify({ rows: payload }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    router.push("/week");
    router.refresh();
  }

  return (
    <div className="px-4 py-5">
      <h1 className="safe-top mb-1 text-2xl font-bold">Import a meal plan</h1>
      <p className="mb-4 text-sm text-muted">
        {step === "file" && "Step 1 of 3: choose a file"}
        {step === "check" && "Step 2 of 3: check the columns"}
        {step === "confirm" && "Step 3 of 3: estimate and confirm"}
      </p>

      {step === "file" && <FileStep onParsed={handleParsed} />}

      {step === "check" && sheet && (
        <div className="space-y-4">
          {rows.length === 0 || map.date === undefined || map.name === undefined ? (
            <p className="rounded-xl bg-amber-soft px-3 py-2 text-sm font-medium text-amber-ink">
              {map.date === undefined || map.name === undefined
                ? "Pick which columns hold the date and the meal name."
                : "No usable rows found in that file."}
            </p>
          ) : null}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <button
              type="button"
              className="flex w-full items-center justify-between font-semibold"
              onClick={() => setShowMapping((s) => !s)}
            >
              Columns
              <span className="text-sm font-medium text-primary">
                {showMapping ? "Done" : "Change"}
              </span>
            </button>
            {showMapping && (
              <div className="mt-3">
                <MappingChips headers={sheet.headers} map={map} onChange={handleMapChange} />
              </div>
            )}
          </div>
          <PreviewList rows={rows} plannedDates={plannedDates} onToggle={toggleRow} />
          <ConfirmFooter
            label={
              commitList.length === 0
                ? "Nothing to import"
                : `Continue with ${commitList.length} ${commitList.length === 1 ? "dinner" : "dinners"}`
            }
            disabled={commitList.length === 0}
            error={null}
            onConfirm={startEstimates}
            onBack={() => setStep("file")}
          />
        </div>
      )}

      {step === "confirm" && (
        <div className="space-y-4">
          <EstimateStep rows={commitList} progress={progress} />
          <ConfirmFooter
            label={
              busy
                ? "Importing…"
                : `Import ${commitList.length} ${commitList.length === 1 ? "dinner" : "dinners"}`
            }
            disabled={busy || progress !== null || commitList.length === 0}
            error={error}
            onConfirm={commit}
            onBack={() => setStep("check")}
          />
        </div>
      )}

      {step === "file" && (
        <div className="mt-6">
          <Button variant="ghost" full onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
