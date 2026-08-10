"use client";

/* eslint-disable @next/next/no-img-element */

import { useState } from "react";
import { formatShort } from "@/lib/dates";
import type { Slot } from "@/lib/schemas";
import { SLOT_LABELS } from "@/lib/slots";

export function ReviewHeader({
  name,
  slot,
  date,
  photoUrl,
  aiNotes,
  onNameChange,
  onClose,
}: {
  name: string;
  slot: Slot;
  date: string;
  photoUrl: string | null;
  aiNotes: string | null;
  onNameChange: (name: string) => void;
  onClose: () => void;
}) {
  const [confirmClose, setConfirmClose] = useState(false);

  return (
    <header className="space-y-3">
      <div className="flex items-center justify-between">
        {confirmClose ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted">Discard changes?</span>
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-full px-3 text-sm font-semibold text-danger"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={() => setConfirmClose(false)}
              className="h-11 rounded-full px-3 text-sm font-semibold text-primary"
            >
              Keep reviewing
            </button>
          </div>
        ) : (
          <button
            type="button"
            aria-label="Close"
            onClick={() => setConfirmClose(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-xl"
          >
            ✕
          </button>
        )}
        <div className="flex gap-2 text-sm">
          <span className="rounded-full bg-surface2 px-3 py-1.5 font-medium">
            {SLOT_LABELS[slot]}
          </span>
          <span className="rounded-full bg-surface2 px-3 py-1.5 font-medium">
            {formatShort(date)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {photoUrl && (
          <img
            src={photoUrl}
            alt="Meal photo"
            className="h-16 w-16 rounded-xl object-cover"
          />
        )}
        <input
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Meal name"
          className="h-12 w-full rounded-xl border border-transparent bg-transparent text-xl font-bold outline-none focus:border-line focus:bg-surface focus:px-3"
        />
      </div>
      {aiNotes && <p className="text-sm text-muted">{aiNotes}</p>}
    </header>
  );
}
