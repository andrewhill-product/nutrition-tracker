"use client";

import { useRouter } from "next/navigation";
import type { RepeatWithItems } from "@/lib/queries";
import { fetchJson } from "@/lib/fetchJson";
import { SLOT_LABELS } from "@/lib/slots";

export function RepeatsCard({ repeats }: { repeats: RepeatWithItems[] }) {
  const router = useRouter();

  async function deleteRepeat(id: number) {
    const res = await fetchJson(`/api/repeats/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Repeat meals</h2>
      <p className="text-sm text-muted">
        Saved from meals you have already reviewed. Logging a repeat uses your
        approved values directly, with no analysis call.
      </p>
      {repeats.length > 0 ? (
        <ul className="divide-y divide-line">
          {repeats.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{r.name}</p>
                <p className="tnum text-xs text-muted">
                  {SLOT_LABELS[r.slot]} · {r.items.reduce((s, i) => s + i.kcal, 0)} kcal
                </p>
              </div>
              <button
                type="button"
                aria-label={`Delete repeat: ${r.name}`}
                onClick={() => deleteRepeat(r.id)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted"
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">
          No repeats yet. Open a logged meal and tap Save as repeat.
        </p>
      )}
    </div>
  );
}
