"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { addDays, todayLondon } from "@/lib/dates";

/**
 * Whole-screen day swiping for Today: left for the next day, right for the
 * previous. Requires clear horizontal intent (60px or more, and dominant over
 * vertical movement) so ordinary scrolling never flips the day.
 */
export function SwipeDays({
  date,
  children,
}: {
  date: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const start = useRef<{ x: number; y: number } | null>(null);

  function go(target: string) {
    router.push(target === todayLondon() ? "/" : `/?date=${target}`);
  }

  return (
    <div
      onTouchStart={(e) => {
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }}
      onTouchEnd={(e) => {
        if (!start.current) return;
        const dx = e.changedTouches[0].clientX - start.current.x;
        const dy = e.changedTouches[0].clientY - start.current.y;
        start.current = null;
        if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
        go(addDays(date, dx > 0 ? -1 : 1));
      }}
    >
      {children}
    </div>
  );
}
