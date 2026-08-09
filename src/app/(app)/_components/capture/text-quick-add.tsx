"use client";

import { Button } from "../ui/button";

export function TextQuickAdd({
  value,
  onChange,
  onNext,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">What did you eat?</h2>
      <textarea
        autoFocus
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="For example: 2 slices of wholemeal toast with peanut butter and a banana"
        className="w-full rounded-xl border border-line bg-surface p-3 text-base outline-none focus:border-primary"
      />
      <Button full onClick={onNext} disabled={value.trim().length === 0}>
        Next
      </Button>
      <Button variant="ghost" full onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
