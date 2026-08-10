"use client";

import { useState } from "react";
import { Button } from "../ui/button";

/**
 * Closing the review. For a fresh AI analysis this is the one moment the app
 * can learn from a bad reading, so it asks (optionally) what the meal really
 * was; the answer feeds calibration and can relaunch analysis as a
 * description. Other modes get a plain discard confirm.
 */
export function DiscardSheet({
  canNote,
  busy,
  onKeep,
  onDiscard,
}: {
  canNote: boolean;
  busy: boolean;
  onKeep: () => void;
  onDiscard: (note: string | null, logFromNote: boolean) => void;
}) {
  const [note, setNote] = useState("");
  const trimmed = note.trim();

  // While the discard is in flight, cancelling must be impossible: discard()
  // proceeds when the POST resolves, so a "cancelled" sheet would still close
  // the review a moment later.
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40"
      onClick={busy ? undefined : onKeep}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={canNote ? "Bin this analysis?" : "Discard changes?"}
        className="safe-bottom w-full max-w-lg space-y-3 rounded-t-3xl bg-surface p-5"
        onClick={(e) => e.stopPropagation()}
      >
        {canNote ? (
          <>
            <h2 className="text-lg font-bold">Bin this analysis?</h2>
            <p className="text-sm text-muted">
              Say what it actually was and the app calibrates from the mistake.
            </p>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was it actually? e.g. a cheese omelette"
              maxLength={500}
              className="h-12 w-full rounded-xl border border-line bg-surface2/50 px-3 outline-none focus:border-primary"
            />
            {trimmed.length > 0 && (
              <Button full disabled={busy} onClick={() => onDiscard(trimmed, true)}>
                {busy ? "Working…" : "Discard and log from my description"}
              </Button>
            )}
            <Button
              variant="secondary"
              full
              disabled={busy}
              onClick={() => onDiscard(trimmed.length > 0 ? trimmed : null, false)}
            >
              Just discard
            </Button>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold">Discard changes?</h2>
            <Button variant="secondary" full disabled={busy} onClick={() => onDiscard(null, false)}>
              Discard
            </Button>
          </>
        )}
        <button
          type="button"
          onClick={onKeep}
          disabled={busy}
          className="flex h-12 w-full items-center justify-center rounded-xl font-semibold text-muted disabled:opacity-50"
        >
          Keep reviewing
        </button>
      </div>
    </div>
  );
}
