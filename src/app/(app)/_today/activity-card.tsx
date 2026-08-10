import type { DailyActivity, Workout } from "@/db/schema";
import { intLabel, minutesLabel } from "@/lib/format";

/**
 * Apple Health data for the day. Renders nothing when nothing has synced;
 * every metric is optional so Watch-less days degrade to steps alone.
 * Copy stays descriptive: no "earned" calories, no compensation framing.
 */
export function ActivityCard({
  activity,
  workouts,
  eatenKcal,
  showWeight,
}: {
  activity: DailyActivity | null;
  workouts: Workout[];
  eatenKcal: number;
  showWeight: boolean;
}) {
  if (activity === null && workouts.length === 0) return null;

  const a = activity;
  const totalBurn =
    a !== null && a.activeKcal !== null && a.restingKcal !== null
      ? a.activeKcal + a.restingKcal
      : null;

  const stats: { value: string; label: string }[] = [];
  if (a?.steps != null) stats.push({ value: intLabel(a.steps), label: "steps" });
  if (totalBurn !== null) {
    stats.push({ value: intLabel(totalBurn), label: "kcal burned" });
  } else if (a?.activeKcal != null) {
    stats.push({ value: intLabel(a.activeKcal), label: "active kcal" });
  }
  if (a?.exerciseMinutes != null)
    stats.push({ value: minutesLabel(a.exerciseMinutes), label: "exercise" });
  if (a?.restingHr != null)
    stats.push({ value: `${a.restingHr} bpm`, label: "resting heart rate" });

  const weightKg = showWeight && a?.weightKg != null ? a.weightKg : null;

  if (stats.length === 0 && weightKg === null && workouts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Activity</h2>
        <span className="text-xs text-muted">Apple Health</span>
      </div>

      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="tnum text-lg font-semibold">{s.value}</p>
              <p className="text-xs text-muted">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {workouts.length > 0 && (
        <div
          className={
            stats.length > 0
              ? "mt-3 space-y-2 border-t border-line pt-3"
              : "space-y-2"
          }
        >
          {workouts.map((w) => (
            <div key={w.id} className="flex items-center justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {w.activityType}
                {w.startedAt && <span className="text-muted"> at {w.startedAt}</span>}
              </span>
              <span className="tnum shrink-0 text-muted">
                {minutesLabel(w.durationMin)}
                {w.activeKcal !== null && `, ${intLabel(w.activeKcal)} kcal`}
              </span>
            </div>
          ))}
        </div>
      )}

      {(weightKg !== null || (totalBurn !== null && eatenKcal > 0)) && (
        <div className="mt-3 space-y-1 border-t border-line pt-3 text-sm text-muted">
          {totalBurn !== null && eatenKcal > 0 && (
            <p>
              Ate {intLabel(eatenKcal)} kcal, burned {intLabel(totalBurn)} kcal.
            </p>
          )}
          {weightKg !== null && <p>Weight {weightKg} kg.</p>}
        </div>
      )}
    </section>
  );
}
