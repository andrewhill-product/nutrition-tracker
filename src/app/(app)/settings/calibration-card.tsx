"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CalibrationNote } from "@/db/schema";
import { fetchJson } from "@/lib/fetchJson";
import { Button } from "../_components/ui/button";

export function CalibrationCard({ notes }: { notes: CalibrationNote[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  async function updateCalibration() {
    setBusy(true);
    setMessage(null);
    setFailed(false);
    const res = await fetchJson<{ notes: CalibrationNote[]; message: string }>(
      "/api/distil",
      { method: "POST" }
    );
    setBusy(false);
    if (res.ok) {
      setMessage(res.data.message);
      router.refresh();
    } else {
      setFailed(true);
      setMessage(res.error);
    }
  }

  async function deleteNote(id: number) {
    const res = await fetchJson(`/api/calibration/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Calibrated to you</h2>
      <p className="text-sm text-muted">
        Claude adjusts its estimates using rules written from your corrections.
        It is calibrated to you; the model itself does not learn.
      </p>
      {notes.length > 0 ? (
        <ul className="divide-y divide-line">
          {notes.map((note) => (
            <li key={note.id} className="flex items-center justify-between gap-2 py-2">
              <span className="text-sm">{note.note}</span>
              <button
                type="button"
                aria-label={`Delete rule: ${note.note}`}
                onClick={() => deleteNote(note.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No rules yet. Correct a few estimates, then update the calibration.
        </p>
      )}
      {message && (
        <p className={`text-sm ${failed ? "text-danger" : "text-fibre"}`}>{message}</p>
      )}
      <Button variant="secondary" full onClick={updateCalibration} disabled={busy}>
        {busy ? "Updating…" : "Update calibration"}
      </Button>
    </div>
  );
}
