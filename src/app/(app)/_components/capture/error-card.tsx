"use client";

import { Button } from "../ui/button";

/** In-flow error card, never a toast. */
export function ErrorCard({
  message,
  onRetry,
  onManual,
  onCancel,
}: {
  message: string;
  onRetry?: () => void;
  onManual: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-4 py-4 text-center">
      <div className="text-4xl" aria-hidden>
        😕
      </div>
      <p className="font-medium">{message}</p>
      <div className="space-y-2">
        {onRetry && (
          <Button full onClick={onRetry}>
            Try again
          </Button>
        )}
        <Button variant="secondary" full onClick={onManual}>
          Enter by hand
        </Button>
        <Button variant="ghost" full onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
