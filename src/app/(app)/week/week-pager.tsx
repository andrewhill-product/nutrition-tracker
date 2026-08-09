"use client";

import { useRouter } from "next/navigation";
import { addDays, formatDayMonth, mondayOf, todayLondon } from "@/lib/dates";

/** Monday to Sunday pager; arrows page both back and forward. */
export function WeekPager({ start }: { start: string }) {
  const router = useRouter();
  const currentWeek = mondayOf(todayLondon());

  function go(target: string) {
    router.push(target === currentWeek ? "/week" : `/week?start=${target}`);
  }

  return (
    <div className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-2">
        <button
          type="button"
          aria-label="Previous week"
          onClick={() => go(addDays(start, -7))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="font-bold">
            {start === currentWeek ? "This week" : `${formatDayMonth(start)} to ${formatDayMonth(addDays(start, 6))}`}
          </p>
          <p className="text-xs text-muted">
            {start === currentWeek
              ? `${formatDayMonth(start)} to ${formatDayMonth(addDays(start, 6))}`
              : "Monday to Sunday"}
          </p>
        </div>
        <button
          type="button"
          aria-label="Next week"
          onClick={() => go(addDays(start, 7))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted"
        >
          ›
        </button>
      </div>
    </div>
  );
}
