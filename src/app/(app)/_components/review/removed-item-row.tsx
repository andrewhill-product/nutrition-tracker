"use client";

import type { ReviewItem } from "./types";

export function RemovedItemRow({
  item,
  onUndo,
}: {
  item: ReviewItem;
  onUndo: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3 opacity-70">
      <span className="text-muted line-through">{item.name}</span>
      <button
        type="button"
        onClick={onUndo}
        className="h-11 rounded-full px-4 text-sm font-semibold text-primary"
      >
        Undo
      </button>
    </div>
  );
}
