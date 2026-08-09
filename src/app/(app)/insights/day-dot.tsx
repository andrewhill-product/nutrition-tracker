import type { DayState } from "@/lib/goals";

/**
 * The shared dot language for WeekDots and the month grid, so the two can
 * never drift: green filled = on track, amber filled = close, slate filled =
 * over, dashed outline = empty or incomplete (unmistakable from a miss).
 */
export function dotClass(state: DayState): string {
  switch (state) {
    case "on-track":
      return "bg-fibre";
    case "near-miss":
      return "bg-carbs";
    case "off-track":
      return "bg-muted";
    default:
      return "border border-dashed border-line bg-transparent";
  }
}

export function DayDot({ state, size = "h-3 w-3" }: { state: DayState; size?: string }) {
  return <span className={`inline-block rounded-full ${size} ${dotClass(state)}`} aria-hidden />;
}

export function DotLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
      <span className="flex items-center gap-1"><DayDot state="on-track" size="h-2 w-2" /> On track</span>
      <span className="flex items-center gap-1"><DayDot state="near-miss" size="h-2 w-2" /> Close</span>
      <span className="flex items-center gap-1"><DayDot state="off-track" size="h-2 w-2" /> Off track</span>
      <span className="flex items-center gap-1"><DayDot state="empty" size="h-2 w-2" /> Not fully logged</span>
    </div>
  );
}
