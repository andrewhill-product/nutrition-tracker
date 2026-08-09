"use client";

import { useEffect, useRef } from "react";

/**
 * Grams/value stepper with hold-to-accelerate and a tappable value that turns
 * into a numeric input.
 */
export function Stepper({
  value,
  onChange,
  step = 5,
  min = 0,
  max = 5000,
  unit = "g",
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
}) {
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const bump = (dir: 1 | -1, size: number) =>
    onChange(clamp(valueRef.current + dir * size));

  function startHold(dir: 1 | -1) {
    bump(dir, step);
    holdTimer.current = setTimeout(() => {
      holdInterval.current = setInterval(() => bump(dir, step * 2), 120);
    }, 450);
  }

  function endHold() {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    if (holdInterval.current) clearInterval(holdInterval.current);
    holdTimer.current = null;
    holdInterval.current = null;
  }

  const btn =
    "flex h-11 w-11 items-center justify-center rounded-full bg-surface2 text-xl font-semibold select-none";

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className={btn}
        aria-label="Decrease"
        onPointerDown={() => startHold(-1)}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        −
      </button>
      <label className="relative">
        <span className="sr-only">Value in {unit}</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(clamp(Number(e.target.value) || 0))}
          className="tnum h-11 w-24 rounded-lg border border-line bg-surface text-center text-lg font-semibold outline-none focus:border-primary"
        />
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-sm text-muted">
          {unit}
        </span>
      </label>
      <button
        type="button"
        className={btn}
        aria-label="Increase"
        onPointerDown={() => startHold(1)}
        onPointerUp={endHold}
        onPointerLeave={endHold}
        onContextMenu={(e) => e.preventDefault()}
      >
        +
      </button>
    </div>
  );
}
