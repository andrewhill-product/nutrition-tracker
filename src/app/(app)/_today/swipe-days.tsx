"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { addDays, todayLondon } from "@/lib/dates";

/**
 * The entry side for the incoming day's slide-in. Module scope survives
 * client-side navigation, so the outgoing page can hand the direction to the
 * incoming one without touching any storage.
 */
let enterFrom: 1 | -1 | null = null;

/**
 * Whole-screen day swiping for Today with gesture feedback: the page follows
 * the finger once horizontal intent is clear (touch-action pan-y keeps
 * vertical scrolling native), springs back below the commit threshold, and on
 * commit slides out while the next day slides in from the matching side.
 */
export function SwipeDays({
  date,
  children,
}: {
  date: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const box = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const active = useRef(false);
  const committed = useRef(false);

  // Entrance: slide in from the side the swipe implied.
  useEffect(() => {
    const dir = enterFrom;
    const el = box.current;
    if (dir === null || !el) return;
    enterFrom = null;
    const travel = Math.min(el.clientWidth * 0.35, 160);
    el.animate(
      [
        { transform: `translateX(${dir * travel}px)`, opacity: 0.35 },
        { transform: "translateX(0)", opacity: 1 },
      ],
      { duration: 240, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }
    );
  }, [date]);

  function go(target: string) {
    router.push(target === todayLondon() ? "/" : `/?date=${target}`);
  }

  function settleBack(el: HTMLElement, fromX: number) {
    const anim = el.animate(
      [{ transform: `translateX(${fromX}px)` }, { transform: "translateX(0)" }],
      { duration: 200, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" }
    );
    anim.onfinish = () => {
      el.style.transform = "";
      el.style.opacity = "";
    };
  }

  return (
    <div
      ref={box}
      style={{ touchAction: "pan-y" }}
      onTouchStart={(e) => {
        if (committed.current) return;
        start.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        active.current = false;
      }}
      onTouchMove={(e) => {
        const el = box.current;
        if (!start.current || !el || committed.current) return;
        const dx = e.touches[0].clientX - start.current.x;
        const dy = e.touches[0].clientY - start.current.y;
        if (!active.current) {
          // Bail to native scrolling on vertical intent; engage on horizontal.
          if (Math.abs(dy) > 14 && Math.abs(dy) > Math.abs(dx)) {
            start.current = null;
            return;
          }
          if (Math.abs(dx) > 14 && Math.abs(dx) > Math.abs(dy) * 1.3) {
            active.current = true;
          } else {
            return;
          }
        }
        const cap = el.clientWidth * 0.55;
        const pulled = Math.max(-cap, Math.min(cap, dx * 0.9));
        el.style.transform = `translateX(${pulled}px)`;
        el.style.opacity = String(1 - Math.min(0.35, Math.abs(pulled) / (cap * 3)));
      }}
      onTouchEnd={(e) => {
        const el = box.current;
        if (!start.current || !el || committed.current) return;
        const dx = e.changedTouches[0].clientX - start.current.x;
        const wasActive = active.current;
        start.current = null;
        active.current = false;
        if (!wasActive) return;
        if (Math.abs(dx) < 70) {
          settleBack(el, dx * 0.9);
          return;
        }
        // Commit: old day slides out, new day will slide in from the far side.
        committed.current = true;
        enterFrom = dx < 0 ? 1 : -1;
        const travel = el.clientWidth * 0.5;
        el.animate(
          [
            { transform: el.style.transform || "translateX(0)", opacity: el.style.opacity || "1" },
            { transform: `translateX(${dx < 0 ? -travel : travel}px)`, opacity: 0.25 },
          ],
          { duration: 170, easing: "ease-in", fill: "forwards" }
        );
        go(addDays(date, dx > 0 ? -1 : 1));
      }}
      onTouchCancel={() => {
        const el = box.current;
        start.current = null;
        active.current = false;
        if (el && !committed.current) {
          el.style.transform = "";
          el.style.opacity = "";
        }
      }}
    >
      {children}
    </div>
  );
}
