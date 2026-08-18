import type { DailyActivity, Workout } from "@/db/schema";
import { intLabel, minutesLabel } from "@/lib/format";

/**
 * The day's activity: manually entered steps and exercises, plus any legacy
 * synced fields (energy, heart rate, weight) still on the row. Renders
 * nothing when the day is empty; every metric is optional. Copy stays
 * descriptive: no "earned" calories, no compensation framing.
 */
export function ActivityCard({
  activity,
  workouts,
  eatenKcal,
  showWeight,
  action,
}: {
  activity: DailyActivity | null;
  workouts: Workout[];
  eatenKcal: number;
  showWeight: boolean;
  action?: React.ReactNode;
}) {
  if (activity === null && workouts.length === 0) return null;

  const a = activity;
  const totalBurn =
    a !== null && a.activeKcal !== null && a.restingKcal !== null
      ? a.activeKcal + a.restingKcal
      : null;
  const workoutKcal = workouts.reduce((s, w) => s + (w.activeKcal ?? 0), 0);
  const workoutMin = workouts.reduce((s, w) => s + (w.durationMin ?? 0), 0);
  const exerciseMin = a?.exerciseMinutes ?? (workoutMin > 0 ? workoutMin : null);

  const stats: { value: string; label: string }[] = [];
  if (a?.steps != null) stats.push({ value: intLabel(a.steps), label: "steps" });
  if (totalBurn !== null) {
    stats.push({ value: intLabel(totalBurn), label: "kcal burned" });
  } else if (a?.activeKcal != null) {
    stats.push({ value: intLabel(a.activeKcal), label: "active kcal" });
  } else if (workoutKcal > 0) {
    stats.push({ value: intLabel(workoutKcal), label: "exercise kcal" });
  }
  if (exerciseMin !== null)
    stats.push({ value: minutesLabel(exerciseMin), label: "exercise" });
  if (a?.restingHr != null)
    stats.push({ value: `${a.restingHr} bpm`, label: "resting heart rate" });

  const weightKg = showWeight && a?.weightKg != null ? a.weightKg : null;

  if (stats.length === 0 && weightKg === null && workouts.length === 0) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Activity</h2>
        {action}
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
          {workouts.map((w) => {
            const detail = [
              w.durationMin !== null ? minutesLabel(w.durationMin) : null,
              w.activeKcal !== null ? `${intLabel(w.activeKcal)} kcal` : null,
            ]
              .filter(Boolean)
              .join(", ");
            return (
              <div
                key={w.id}
                className="flex items-center justify-between gap-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {w.activityType}
                  {w.startedAt && (
                    <span className="text-muted"> at {w.startedAt}</span>
                  )}
                </span>
                <span className="tnum shrink-0 text-muted">{detail}</span>
              </div>
            );
          })}
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
