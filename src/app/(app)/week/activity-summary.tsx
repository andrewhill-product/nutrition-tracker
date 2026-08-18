import type { DailyActivity, Workout } from "@/db/schema";
import { formatShort } from "@/lib/dates";
import { intLabel, minutesLabel } from "@/lib/format";

/**
 * Week roll-up of activity. Averages only count days that actually have a
 * value, so unrecorded days never drag the numbers down. Exercise time
 * prefers the daily figure (legacy synced rows) and falls back to summing
 * the manually entered exercises.
 */
export function ActivitySummary({
  days,
  workouts,
  showWeight,
}: {
  days: DailyActivity[];
  workouts: Workout[];
  showWeight: boolean;
}) {
  const stepsDays = days.filter((d) => d.steps !== null);
  const burnDays = days.filter(
    (d) => d.activeKcal !== null && d.restingKcal !== null
  );
  const dailyExercise = days.reduce((sum, d) => sum + (d.exerciseMinutes ?? 0), 0);
  const workoutMin = workouts.reduce((sum, w) => sum + (w.durationMin ?? 0), 0);
  const exerciseTotal = dailyExercise > 0 ? dailyExercise : workoutMin;
  const workoutKcal = workouts.reduce((sum, w) => sum + (w.activeKcal ?? 0), 0);
  const avg = (nums: number[]) =>
    Math.round(nums.reduce((a, b) => a + b, 0) / nums.length);

  const stats: { value: string; label: string }[] = [];
  if (stepsDays.length > 0)
    stats.push({
      value: intLabel(avg(stepsDays.map((d) => d.steps as number))),
      label: "steps a day",
    });
  if (burnDays.length > 0)
    stats.push({
      value: intLabel(
        avg(burnDays.map((d) => (d.activeKcal as number) + (d.restingKcal as number)))
      ),
      label: "kcal burned a day",
    });
  if (workoutKcal > 0 && burnDays.length === 0)
    stats.push({ value: intLabel(workoutKcal), label: "exercise kcal" });
  if (exerciseTotal > 0)
    stats.push({ value: minutesLabel(exerciseTotal), label: "exercise this week" });
  if (workouts.length > 0)
    stats.push({
      value: String(workouts.length),
      label: workouts.length === 1 ? "workout" : "workouts",
    });

  const weightReadings = showWeight ? days.filter((d) => d.weightKg !== null) : [];
  const latestWeight = weightReadings[weightReadings.length - 1];

  if (stats.length === 0 && !latestWeight) return null;

  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-3 font-semibold">Activity</h2>
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
      {latestWeight && (
        <p
          className={`text-sm text-muted ${stats.length > 0 ? "mt-3 border-t border-line pt-3" : ""}`}
        >
          Weight {latestWeight.weightKg} kg ({formatShort(latestWeight.date)}).
        </p>
      )}
    </section>
  );
}
