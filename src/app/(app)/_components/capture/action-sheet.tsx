"use client";

import { Sheet } from "../ui/sheet";

export type CaptureAction = "camera" | "library" | "text" | "repeat" | "import";

export function ActionSheet({
  open,
  nonTodayDate,
  hasRepeats,
  onAction,
  onClose,
}: {
  open: boolean;
  nonTodayDate: string | null;
  hasRepeats: boolean;
  onAction: (action: CaptureAction) => void;
  onClose: () => void;
}) {
  const row =
    "flex h-14 w-full items-center gap-3 rounded-xl bg-surface2 px-4 text-left font-semibold";
  return (
    <Sheet open={open} onClose={onClose} title="Add a meal">
      {nonTodayDate && (
        <p className="mb-3 rounded-lg bg-amber-soft px-3 py-2 text-sm font-medium text-amber-ink">
          Logging to {nonTodayDate}, not today.
        </p>
      )}
      <div className="space-y-2">
        <button type="button" className={row} onClick={() => onAction("camera")}>
          <span aria-hidden>📷</span> Take a photo
        </button>
        <button type="button" className={row} onClick={() => onAction("library")}>
          <span aria-hidden>🖼️</span> Choose from library
        </button>
        <button type="button" className={row} onClick={() => onAction("text")}>
          <span aria-hidden>⌨️</span> Type it in
        </button>
        {hasRepeats && (
          <button type="button" className={row} onClick={() => onAction("repeat")}>
            <span aria-hidden>🔁</span> Log a repeat meal
          </button>
        )}
        <button type="button" className={row} onClick={() => onAction("import")}>
          <span aria-hidden>📄</span> Import spreadsheet
        </button>
        <button
          type="button"
          className="flex h-12 w-full items-center justify-center rounded-xl font-semibold text-muted"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </Sheet>
  );
}
