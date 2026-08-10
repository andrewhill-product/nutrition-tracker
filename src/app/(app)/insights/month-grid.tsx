import Link from "next/link";
import { formatDayMonth, formatShort } from "@/lib/dates";
import { DayDot, DotLegend } from "./day-dot";
import type { DayScore } from "./week-dots";

/**
 * Rolling 4-week grid, Mon to Sun columns, sharing the WeekDots dot language.
 */
export function MonthGrid({
  weeks,
  today,
}: {
  weeks: DayScore[][];
  today: string;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="font-semibold">Last 4 weeks</h2>
      <div className="space-y-2">
        <div className="grid grid-cols-8 items-center gap-1.5 text-[10px] text-muted">
          <span />
          {["M", "T", "W", "T2", "F", "S", "S2"].map((d) => (
            <span key={d} className="text-center">
              {d.slice(0, 1)}
            </span>
          ))}
        </div>
        {weeks.map((week) => (
          <div key={week[0].date} className="grid grid-cols-8 items-center gap-1.5">
            <span className="tnum text-[10px] text-muted">{formatDayMonth(week[0].date)}</span>
            {week.map((day) => (
              <Link
                key={day.date}
                href={`/today?date=${day.date}`}
                className="flex justify-center py-0.5"
                aria-label={`${formatShort(day.date)}: ${(day.date > today ? "empty" : day.state).replace("-", " ")}`}
              >
                <DayDot state={day.date > today ? "empty" : day.state} />
              </Link>
            ))}
          </div>
        ))}
      </div>
      <DotLegend />
    </div>
  );
}
