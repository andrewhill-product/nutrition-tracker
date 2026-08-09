"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { addDays, formatLong, relativeLabel, todayLondon } from "@/lib/dates";

/** Sticky date header with arrows and swipe. Forward navigation is allowed. */
export function DateHeader({ date }: { date: string }) {
  const router = useRouter();
  const today = todayLondon();
  const touchStart = useRef<number | null>(null);

  function go(target: string) {
    router.push(target === today ? "/" : `/?date=${target}`);
  }

  return (
    <div
      className="safe-top sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur"
      onTouchStart={(e) => {
        touchStart.current = e.touches[0].clientX;
      }}
      onTouchEnd={(e) => {
        if (touchStart.current === null) return;
        const dx = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(dx) < 60) return;
        go(addDays(date, dx > 0 ? -1 : 1));
      }}
    >
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
