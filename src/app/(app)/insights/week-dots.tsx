import Link from "next/link";
import { formatShort } from "@/lib/dates";
import type { DayState } from "@/lib/goals";
import { DayDot, DotLegend } from "./day-dot";

export type DayScore = { date: string; state: DayState };

/**
 * Mon to Sun dots for the current week with an honest in-progress
 * denominator: scored days only, never N of 7 mid-week.
 */
export function WeekDots({ days, today }: { days: DayScore[]; today: string }) {
  const scored = days.filter(
    (d) => d.date <= today && d.state !== "empty" && d.state !== "incomplete"
  );
  const onTrack = scored.filter((d) => d.state === "on-track").length;

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">This week</h2>
        <span className="tnum text-xs text-muted">
          {scored.length > 0
            ? `On track ${onTrack} of ${scored.length} scored ${scored.length === 1 ? "day" : "days"} so far`
            : "No scored days yet"}
        </span>
      </div>
      <div className="flex justify-between">
        {days.map((day) => (
          <Link
            key={day.date}
            href={day.date === today ? "/" : `/?date=${day.date}`}
            className="flex min-w-9 flex-col items-center gap-1.5 py-1"
            aria-label={`${formatShort(day.date)}: ${day.state.replace("-", " ")}`}
          >
            <span className={`text-[11px] ${day.date === today ? "font-bold" : "text-muted"}`}>
              {formatShort(day.date).slice(0, 2)}
            </span>
            <DayDot state={day.date > today ? "empty" : day.state} size="h-3.5 w-3.5" />
          </Link>
        ))}
      </div>
      <DotLegend />
    </div>
  );
}
