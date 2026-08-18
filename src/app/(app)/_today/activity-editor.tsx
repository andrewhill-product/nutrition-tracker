"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";
import { Button } from "../_components/ui/button";
import { Chip } from "../_components/ui/chip";
import { Sheet } from "../_components/ui/sheet";

const QUICK_TYPES = ["Gym", "Padel", "Running", "Walking", "Cycling", "Football"];

type ExerciseRow = { type: string; kcal: string; minutes: string };

export type InitialExercise = {
  activityType: string;
  kcal: number | null;
  durationMin: number | null;
};

/** "" for empty, otherwise a non-negative integer; NaN flags bad input. */
function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
}

/**
 * Manual steps and exercise entry for a day. Opens as a bottom sheet from
 * the Activity card (edit) or from a slim add row when the day is empty.
 * Save replaces the day's steps and exercises; leaving steps blank clears.
 */
export function ActivityEditor({
  date,
  initialSteps,
  initialExercises,
  variant,
}: {
  date: string;
  initialSteps: number | null;
  initialExercises: InitialExercise[];
  variant: "corner" | "empty";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState("");
  const [rows, setRows] = useState<ExerciseRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openSheet() {
    setSteps(initialSteps === null ? "" : String(initialSteps));
    setRows(
      initialExercises.map((e) => ({
        type: e.activityType,
        kcal: e.kcal === null ? "" : String(e.kcal),
        minutes: e.durationMin === null ? "" : String(e.durationMin),
      }))
    );
    setError(null);
    setOpen(true);
  }

  function addRow(type: string) {
    setRows((prev) => [...prev, { type, kcal: "", minutes: "" }]);
  }

  function updateRow(index: number, patch: Partial<ExerciseRow>) {
    setRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  }

  async function save() {
    const stepsValue = parseOptionalInt(steps);
    const exercises = rows
      .filter((r) => r.type.trim() !== "")
      .map((r) => ({
        activity_type: r.type.trim(),
        kcal: parseOptionalInt(r.kcal),
        duration_min: parseOptionalInt(r.minutes),
      }));
    if (
      Number.isNaN(stepsValue) ||
      exercises.some((e) => Number.isNaN(e.kcal) || Number.isNaN(e.duration_min))
    ) {
      setError("Steps, calories and minutes must be whole numbers.");
      return;
    }
    setBusy(true);
    setError(null);
    const res = await fetchJson("/api/activity", {
      method: "PUT",
      body: JSON.stringify({ date, steps: stepsValue, workouts: exercises }),
    });
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      {variant === "corner" ? (
        <button
          type="button"
          onClick={openSheet}
          className="text-sm font-medium text-primary"
        >
          Edit
        </button>
      ) : (
        <button
          type="button"
          onClick={openSheet}
          className="w-full rounded-2xl border border-dashed border-line p-4 text-center text-sm text-muted"
        >
          Add steps or exercise
        </button>
      )}

      <Sheet open={open} onClose={() => setOpen(false)} title="Activity">
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="activity-steps" className="text-sm font-medium">
              Steps
            </label>
            <input
              id="activity-steps"
              value={steps}
              onChange={(e) => setSteps(e.target.value)}
              inputMode="numeric"
              placeholder="e.g. 9500"
              className="tnum w-32 rounded-xl border border-line bg-surface p-3 text-right text-base"
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Exercise</p>
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  value={row.type}
                  onChange={(e) => updateRow(i, { type: e.target.value })}
                  placeholder="What was it?"
                  className="min-w-0 flex-1 rounded-xl border border-line bg-surface p-3 text-base"
                />
                <input
                  value={row.kcal}
                  onChange={(e) => updateRow(i, { kcal: e.target.value })}
                  inputMode="numeric"
                  placeholder="kcal"
                  aria-label="Calories burned"
                  className="tnum w-18 rounded-xl border border-line bg-surface p-3 text-right text-base"
                />
                <input
                  value={row.minutes}
                  onChange={(e) => updateRow(i, { minutes: e.target.value })}
                  inputMode="numeric"
                  placeholder="min"
                  aria-label="Minutes"
                  className="tnum w-16 rounded-xl border border-line bg-surface p-3 text-right text-base"
                />
                <button
                  type="button"
                  aria-label={`Remove ${row.type || "exercise"}`}
                  onClick={() => setRows((prev) => prev.filter((_, j) => j !== i))}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface2 text-muted"
                >
                  &times;
                </button>
              </div>
            ))}
            <div className="flex flex-wrap gap-2">
              {QUICK_TYPES.map((t) => (
                <Chip key={t} onClick={() => addRow(t)}>
                  {t}
                </Chip>
              ))}
              <Chip onClick={() => addRow("")}>Other</Chip>
            </div>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button full onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save activity"}
          </Button>
        </div>
      </Sheet>
    </>
  );
}
