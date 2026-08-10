import Link from "next/link";
import type { Targets } from "@/db/schema";
import type { MacroTotals } from "@/lib/totals";

const RING_R = 28;
const RING_C = 176; // 2 * pi * 28, matches the ring-fill keyframe in globals.css

const BARS = [
  { key: "protein_g" as const, target: "proteinG" as const, letter: "P", color: "bg-protein" },
  { key: "carbs_g" as const, target: "carbsG" as const, letter: "C", color: "bg-carbs" },
  { key: "fat_g" as const, target: "fatG" as const, letter: "F", color: "bg-fat" },
  { key: "fibre_g" as const, target: "fibreG" as const, letter: "Fb", color: "bg-fibre" },
];

/**
 * The soft day-so-far glance: fill shapes only, no numbers anywhere. The
 * exact figures live one tap away on Today. Past-target fills stay in the
 * same calm colours.
 */
export function GlanceCard({
  totals,
  targets,
  phrase,
}: {
  totals: MacroTotals;
  targets: Targets;
  phrase: string;
}) {
  const frac = targets.kcal > 0 ? Math.min(1, totals.kcal / targets.kcal) : 0;
  return (
    <Link
      href="/today"
      className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 active:bg-surface2"
    >
      <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={RING_R} fill="none" strokeWidth="7" className="stroke-line" />
        <circle
          cx="32"
          cy="32"
          r={RING_R}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          className="ring-fill stroke-primary"
          strokeDasharray={RING_C}
          strokeDashoffset={RING_C * (1 - frac)}
        />
      </svg>
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="text-sm font-medium">{phrase}</p>
        <div className="flex items-center gap-2">
          {BARS.map((bar) => {
            const t = targets[bar.target];
            const fill = t > 0 ? Math.min(100, ((totals[bar.key] ?? 0) / t) * 100) : 0;
            return (
              <span key={bar.key} className="flex flex-1 items-center gap-1">
                <span className="text-[10px] text-muted">{bar.letter}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                  <span
                    className={`bar-fill block h-full rounded-full ${bar.color}`}
                    style={{ width: `${fill}%` }}
                  />
                </span>
              </span>
            );
          })}
        </div>
        <p className="text-xs text-muted">Tap for the full picture</p>
      </div>
    </Link>
  );
}
