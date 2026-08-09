import { addDays, formatShort, mondayOf, todayLondon } from "@/lib/dates";
import {
  dayState,
  GOALS,
  goalsHit,
  goalStatus,
  goalTarget,
  goalValue,
} from "@/lib/goals";
import { getRange, getTargets } from "@/lib/queries";
import { dayTotals, type MealWithItems } from "@/lib/totals";
import { GoalHitRates, type HitRate } from "./goal-hit-rates";
import { GoalReportCard } from "./goal-report-card";
import { KcalTrend30, type TrendPoint } from "./kcal-trend-30";
import { MonthGrid } from "./month-grid";
import { StatTiles } from "./stat-tiles";
import { WeekDots, type DayScore } from "./week-dots";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const today = todayLondon();
  const weekStart = mondayOf(today);
  const gridStart = addDays(weekStart, -21);
  const trendStart = addDays(today, -29);
  const rangeStart = trendStart < gridStart ? trendStart : gridStart;

  const [meals, targets] = await Promise.all([
    getRange(rangeStart, addDays(weekStart, 6)),
    getTargets(),
  ]);

  const byDate = new Map<string, MealWithItems[]>();
  for (const meal of meals) {
    const list = byDate.get(meal.date) ?? [];
    list.push(meal);
    byDate.set(meal.date, list);
  }

  const scoreDay = (date: string): DayScore => {
    const dayMeals = byDate.get(date) ?? [];
    const logged = dayMeals.filter((m) => m.status === "logged");
    return {
      date,
      state: dayState(dayTotals(dayMeals), logged.length, targets),
    };
  };

  // Today's report card.
  const todayMeals = byDate.get(today) ?? [];
  const todayTotals = dayTotals(todayMeals);
  const todayScore = scoreDay(today);

  // Current week dots and the 4-week grid.
  const weekDays = Array.from({ length: 7 }, (_, i) => scoreDay(addDays(weekStart, i)));
  const weeks: DayScore[][] = Array.from({ length: 4 }, (_, w) =>
    Array.from({ length: 7 }, (_, i) => scoreDay(addDays(gridStart, w * 7 + i)))
  );

  // Scored-day stats over the 4-week grid window (up to today).
  const gridScores = weeks
    .flat()
    .filter((d) => d.date <= today);
  const scoredDays = gridScores.filter(
    (d) => d.state !== "empty" && d.state !== "incomplete"
  );
  const onTrackDays = scoredDays.filter((d) => d.state === "on-track").length;

  // Per-goal hit rates over the scored days.
  const rates: HitRate[] = GOALS.map((g) => ({
    key: g.key,
    label: g.label,
    direction: g.direction,
    hit: scoredDays.filter((d) => {
      const totals = dayTotals(byDate.get(d.date) ?? []);
      return goalStatus(g.direction, goalValue(totals, g.key), goalTarget(targets, g.key)) === "hit";
    }).length,
  }));

  // Logging streak: consecutive non-empty, non-incomplete or simply logged
  // days ending today or yesterday (today only counts once it has a meal).
  let streak = 0;
  let cursor = (byDate.get(today) ?? []).some((m) => m.status === "logged")
    ? today
    : addDays(today, -1);
  while ((byDate.get(cursor) ?? []).some((m) => m.status === "logged")) {
    streak += 1;
    cursor = addDays(cursor, -1);
    if (streak > 400) break;
  }
  const totalLogged = new Set(
    meals.filter((m) => m.status === "logged").map((m) => m.date)
  ).size;

  // Planned dinners followed (neutral): a spreadsheet-sourced logged dinner
  // counts as followed; a planned dinner still unconverted on a past date
  // counts as not followed.
  const pastOrToday = meals.filter((m) => m.date <= today && m.slot === "dinner");
  const planFollowed = new Set(
    pastOrToday
      .filter((m) => m.status === "logged" && m.source === "spreadsheet")
      .map((m) => m.date)
  ).size;
  const planMissed = new Set(
    pastOrToday
      .filter((m) => m.status === "planned" && m.date < today)
      .map((m) => m.date)
  ).size;

  // 30-day calorie trend with a 7-day rolling average over logged days.
  const trendDates = Array.from({ length: 30 }, (_, i) => addDays(trendStart, i));
  const dailyKcal = trendDates.map((date) => {
    const dayMeals = byDate.get(date) ?? [];
    const logged = dayMeals.some((m) => m.status === "logged");
    return logged ? dayTotals(dayMeals).kcal : null;
  });
  const points: TrendPoint[] = trendDates.map((date, i) => {
    const window = dailyKcal.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v !== null);
    return {
      date,
      label: formatShort(date).slice(4),
      kcal: dailyKcal[i],
      avg: window.length >= 3 ? window.reduce((a, b) => a + b, 0) / window.length : null,
    };
  });

  return (
    <div className="space-y-4 px-4 py-5">
      <h1 className="safe-top text-2xl font-bold">Insights</h1>
      <GoalReportCard
        totals={todayTotals}
        targets={targets}
        state={todayScore.state}
        hit={goalsHit(todayTotals, targets)}
      />
      <WeekDots days={weekDays} today={today} />
      <StatTiles
        streak={streak}
        totalLogged={totalLogged}
        onTrack={onTrackDays}
        scored={scoredDays.length}
        planFollowed={planFollowed}
        planTotal={planFollowed + planMissed}
      />
      <GoalHitRates rates={rates} scored={scoredDays.length} />
      <div className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="mb-2 font-semibold">Calories, last 30 days</h2>
        <KcalTrend30 points={points} target={targets.kcal} />
      </div>
      <MonthGrid weeks={weeks} today={today} />
    </div>
  );
}
