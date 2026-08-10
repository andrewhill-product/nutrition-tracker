import type { DailyActivity, Workout } from "@/db/schema";
import { formatShort } from "@/lib/dates";
import { intLabel, minutesLabel } from "@/lib/format";

/**
 * Week roll-up of Apple Health data. Averages only count days that actually
 * synced a value, so Watch-less days never drag the numbers down.
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
  const exerciseTotal = days.reduce((sum, d) => sum + (d.exerciseMinutes ?? 0), 0);
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
