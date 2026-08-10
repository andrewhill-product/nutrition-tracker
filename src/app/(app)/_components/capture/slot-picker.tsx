"use client";

import { formatShort, relativeLabel } from "@/lib/dates";
import type { Slot } from "@/lib/schemas";
import { SLOT_LABELS, SLOT_LIST } from "@/lib/slots";
import { Button } from "../ui/button";
import { Chip } from "../ui/chip";
import { PhotoPreview } from "./photo-preview";

const SLOTS: { value: Slot; label: string }[] = SLOT_LIST.map((value) => ({
  value,
  label: SLOT_LABELS[value],
}));

/** Always shown before analysis, photo and text paths alike. */
export function SlotPicker({
  slot,
  date,
  today,
  previewUrl,
  uploading,
  labelPreviewUrl = null,
  labelUploading = false,
  onAddLabel,
  actionLabel = "Analyse",
  onSlotChange,
  onAnalyse,
  onCancel,
}: {
  slot: Slot | null;
  date: string;
  today: string;
  previewUrl: string | null;
  uploading: boolean;
  labelPreviewUrl?: string | null;
  labelUploading?: boolean;
  onAddLabel?: () => void;
  actionLabel?: string;
  onSlotChange: (slot: Slot) => void;
  onAnalyse: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <PhotoPreview previewUrl={previewUrl} uploading={uploading} />
      {previewUrl && onAddLabel && (
        <button
          type="button"
          onClick={onAddLabel}
          className="mx-auto flex items-center gap-2 rounded-xl border border-dashed border-line px-3 py-2 text-sm font-medium text-muted"
        >
          {labelPreviewUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={labelPreviewUrl}
                alt="Nutrition label photo"
                className="h-9 w-9 rounded-lg object-cover"
              />
              {labelUploading ? "Uploading label…" : "Label added. Tap to retake"}
            </>
          ) : (
            <>📦 Add the box label (optional)</>
          )}
        </button>
      )}
      <h2 className="text-lg font-semibold">Which meal is this?</h2>
      <div className="grid grid-cols-2 gap-2">
        {SLOTS.map((s) => (
          <Chip
            key={s.value}
            selected={slot === s.value}
            onClick={() => onSlotChange(s.value)}
            className="h-14 w-full text-base"
          >
            {s.label}
          </Chip>
        ))}
      </div>
      <div className="flex items-center justify-between rounded-xl bg-surface2 px-4 py-3">
        <span className="text-sm text-muted">Logging to</span>
        <span className="font-semibold">
          {relativeLabel(date, today)}
          {date !== today && (
            <span className="ml-1 text-sm font-normal text-muted">
              ({formatShort(date)})
            </span>
          )}
        </span>
      </div>
      {date !== today && (
        <p className="rounded-lg bg-amber-soft px-3 py-2 text-sm font-medium text-amber-ink">
          This will be logged to a past day, not today.
        </p>
      )}
      <div className="sticky bottom-0 space-y-2 bg-surface pb-2 pt-1">
        <Button full onClick={onAnalyse} disabled={slot === null || uploading}>
          {uploading ? "Waiting for upload…" : actionLabel}
        </Button>
        <Button variant="ghost" full onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
