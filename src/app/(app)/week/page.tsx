import { addDays, formatShort, isDateString, mondayOf, todayLondon } from "@/lib/dates";
import { getTargets, getWeek } from "@/lib/queries";
import { dayTotals } from "@/lib/totals";
import { KcalTrendChart, type DayBar } from "./kcal-trend-chart";
import { MacroSplitCard } from "./macro-split-card";
import { PlannedVsActual } from "./planned-vs-actual";
import { WeekPager } from "./week-pager";

export const dynamic = "force-dynamic";

export default async function WeekPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const params = await searchParams;
  const today = todayLondon();
  const start =
    params.start && isDateString(params.start)
      ? mondayOf(params.start)
      : mondayOf(today);

  const [meals, targets] = await Promise.all([getWeek(start), getTargets()]);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const perDay = dates.map((date) => {
    const dayMeals = meals.filter((m) => m.date === date);
    const totals = dayTotals(dayMeals);
    const hasLogged = dayMeals.some((m) => m.status === "logged");
    return { date, totals, hasLogged };
  });

  const bars: DayBar[] = perDay.map((d) => ({
    date: d.date,
    label: formatShort(d.date).slice(0, 3),
    kcal: Math.round(d.totals.kcal),
  }));

  const countedDays = perDay.filter((d) => d.hasLogged);
  const avg = (pick: (t: (typeof perDay)[0]["totals"]) => number) =>
    countedDays.length > 0
      ? countedDays.reduce((sum, d) => sum + pick(d.totals), 0) / countedDays.length
      : 0;

  return (
    <div>
      <WeekPager start={start} />
      <div className="space-y-4 px-4 py-5">
        <div className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="mb-2 font-semibold">Calories</h2>
          <KcalTrendChart days={bars} target={targets.kcal} />
        </div>
        <MacroSplitCard
          protein={avg((t) => t.protein_g)}
          carbs={avg((t) => t.carbs_g)}
          fat={avg((t) => t.fat_g)}
          fibre={avg((t) => t.fibre_g)}
          daysCounted={countedDays.length}
        />
        <PlannedVsActual dates={dates} meals={meals} today={today} />
      </div>
    </div>
  );
}
