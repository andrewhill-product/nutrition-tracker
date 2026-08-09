import type { Targets } from "@/db/schema";
import {
  GOALS,
  goalStatus,
  goalTarget,
  goalValue,
  type DayState,
} from "@/lib/goals";
import type { MacroTotals } from "@/lib/totals";

function fmt(v: number): string {
  return String(Math.round(v));
}

function headline(state: DayState, totals: MacroTotals, targets: Targets): string {
  if (state === "empty") return "Nothing logged yet today.";
  if (state === "incomplete") return "Log the rest of today to score it.";
  if (state === "on-track") return "On track today.";
  if (state === "near-miss") return "Close today.";
  const kcalOff = goalStatus("ceiling", totals.kcal, targets.kcal) === "off";
  const proteinOff = goalStatus("floor", totals.protein_g, targets.proteinG) === "off";
  if (kcalOff && proteinOff) return "Over on calories and short on protein today.";
  if (kcalOff) return "Over the calorie budget today.";
  return "Short on protein today.";
}

/**
 * One direction-aware bar per goal with a target tick. Ceilings fill toward
 * the limit and the overrun past the tick renders amber, never red; floors
 * fill toward the target and the tick strengthens once reached. Sublabels
 * state facts (headroom or distance), never a bare percentage.
 */
export function GoalReportCard({
  totals,
  targets,
  state,
  hit,
}: {
  totals: MacroTotals;
  targets: Targets;
  state: DayState;
  hit: number;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Today against your targets</h2>
        {state !== "empty" && state !== "incomplete" && (
          <span className="tnum text-xs text-muted">{hit} of 6 hit</span>
        )}
      </div>
      <p className="text-sm text-muted">{headline(state, totals, targets)}</p>
      <div className="space-y-3.5">
        {GOALS.map((goal) => {
          const value = goalValue(totals, goal.key);
          const target = goalTarget(targets, goal.key);
          const status = goalStatus(goal.direction, value, target);
          const scaleMax = Math.max(target * 1.25, value, 1);
          const tickPct = (target / scaleMax) * 100;
          const basePct = (Math.min(value, target) / scaleMax) * 100;
          const overPct = (Math.max(0, value - target) / scaleMax) * 100;
          const floorReached = goal.direction === "floor" && value >= target;

          const sub =
            goal.direction === "ceiling"
              ? value > target
                ? `${fmt(value - target)}${goal.unit === "kcal" ? " kcal" : "g"} over the ${goal.unit === "kcal" ? "budget" : "limit"}`
                : `${fmt(target - value)}${goal.unit === "kcal" ? " kcal" : "g"} left of ${fmt(target)}`
              : value >= target
                ? `Reached ${fmt(target)}${goal.unit}`
                : `${fmt(target - value)}${goal.unit} to go`;

          return (
            <div key={goal.key}>
              <div className="mb-1 flex items-baseline justify-between text-xs">
                <span className="font-medium">{goal.label}</span>
                <span className="tnum text-muted">
                  {fmt(value)} / {fmt(target)}
                  {goal.unit === "kcal" ? " kcal" : "g"}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-line">
                <div
                  className={`absolute inset-y-0 left-0 rounded-full ${goal.colorBg}`}
                  style={{ width: `${basePct}%` }}
                />
                {goal.direction === "ceiling" && overPct > 0 && (
                  <div
                    className={`absolute inset-y-0 ${status === "off" ? "bg-danger" : "bg-carbs/80"}`}
                    style={{ left: `${tickPct}%`, width: `${overPct}%` }}
                  />
                )}
                <div
                  className={`absolute inset-y-0 w-0.5 ${floorReached ? "bg-ink" : "bg-muted/70"}`}
                  style={{ left: `${tickPct}%` }}
                  aria-hidden
                />
              </div>
              <p
                className={`tnum mt-0.5 text-xs ${
                  goal.direction === "ceiling" && status === "off"
                    ? "font-medium text-danger"
                    : goal.direction === "ceiling" && status === "near"
                      ? "font-medium text-amber-ink"
                      : "text-muted"
                }`}
              >
                {sub}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
