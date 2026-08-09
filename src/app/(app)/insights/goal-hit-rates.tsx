import { GOALS } from "@/lib/goals";

export type HitRate = { key: string; label: string; direction: "ceiling" | "floor"; hit: number };

/**
 * Per-goal hit rate over scored days only, with the denominator always
 * printed. Ceilings read "stayed under", floors read "reached".
 */
export function GoalHitRates({ rates, scored }: { rates: HitRate[]; scored: number }) {
  if (scored === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        Goal hit rates appear once a few full days are logged.
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Goal hit rates</h2>
        <span className="tnum text-xs text-muted">
          over {scored} scored {scored === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="space-y-2.5">
        {rates.map((rate) => {
          const meta = GOALS.find((g) => g.key === rate.key);
          const pct = Math.round((rate.hit / scored) * 100);
          return (
            <div key={rate.key}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium">
                  {rate.label}
                  <span className="ml-1.5 text-muted">
                    {rate.direction === "ceiling" ? "stayed under" : "reached"}
                  </span>
                </span>
                <span className="tnum text-muted">
                  {rate.hit} of {scored} ({pct}%)
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${meta?.colorBg ?? "bg-primary"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
