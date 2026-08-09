"use client";

import { Button } from "../ui/button";

export function AnalysingCard({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-line border-t-primary" />
      <div>
        <p className="text-lg font-semibold">Analysing your meal…</p>
        <p className="mt-1 text-sm text-muted">Checking portions against UK sizes</p>
      </div>
      <Button variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}
