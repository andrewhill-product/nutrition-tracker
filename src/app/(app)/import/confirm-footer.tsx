"use client";

import { Button } from "../_components/ui/button";

export function ConfirmFooter({
  label,
  disabled,
  error,
  onConfirm,
  onBack,
}: {
  label: string;
  disabled: boolean;
  error: string | null;
  onConfirm: () => void;
  onBack: () => void;
}) {
  return (
    <div className="safe-bottom sticky bottom-14 -mx-4 space-y-2 border-t border-line bg-surface/95 px-4 py-3 backdrop-blur">
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button full onClick={onConfirm} disabled={disabled}>
        {label}
      </Button>
      <Button variant="ghost" full onClick={onBack}>
        Back
      </Button>
    </div>
  );
}
