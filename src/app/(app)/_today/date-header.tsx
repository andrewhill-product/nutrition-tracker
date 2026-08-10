"use client";

import { useRouter } from "next/navigation";
import { addDays, formatLong, relativeLabel, todayLondon } from "@/lib/dates";

/**
 * Sticky date header with arrows. Whole-screen swiping lives in SwipeDays,
 * which wraps the page, so this component only handles the buttons.
 */
export function DateHeader({ date }: { date: string }) {
  const router = useRouter();
  const today = todayLondon();

  function go(target: string) {
    router.push(target === today ? "/today" : `/today?date=${target}`);
  }

  return (
    <div className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-2">
        <button
          type="button"
          aria-label="Previous day"
          onClick={() => go(addDays(date, -1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted"
        >
          ‹
        </button>
        <div className="text-center">
          <p className="font-bold">{relativeLabel(date, today)}</p>
          <p className="text-xs text-muted">{formatLong(date)}</p>
        </div>
        <button
          type="button"
          aria-label="Next day"
          onClick={() => go(addDays(date, 1))}
          className="flex h-11 w-11 items-center justify-center rounded-full text-xl text-muted"
        >
          ›
        </button>
      </div>
    </div>
  );
}
