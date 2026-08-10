"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { fetchJson } from "@/lib/fetchJson";

export function HealthCard({
  showWeight,
  lastSync,
}: {
  showWeight: boolean;
  lastSync: string | null;
}) {
  const router = useRouter();
  const [on, setOn] = useState(showWeight);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggle() {
    const next = !on;
    setOn(next);
    setBusy(true);
    setError(null);
    const res = await fetchJson("/api/activity/settings", {
      method: "PUT",
      body: JSON.stringify({ show_weight: next }),
    });
    setBusy(false);
    if (!res.ok) {
      setOn(!next);
      setError(res.error);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Apple Health</h2>
      <p className="text-xs text-muted">
        Steps, energy burned, workouts and weight arrive from the Health Sync
        shortcut on your phone (see the guide in the repo).{" "}
        {lastSync ? `Last synced ${lastSync}.` : "Nothing has synced yet."}
      </p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm">Show weight in the app</span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          onClick={toggle}
          disabled={busy}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
            on ? "bg-primary" : "bg-surface2"
          }`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
              on ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
