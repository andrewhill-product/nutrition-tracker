/** SVG kcal ring with an overflow arc and an "over" subline past the target. */
export function KcalRing({ kcal, target }: { kcal: number; target: number }) {
  const r = 62;
  const c = 2 * Math.PI * r;
  const ratio = target > 0 ? kcal / target : 0;
  const base = Math.min(1, ratio);
  const over = Math.max(0, Math.min(1, ratio - 1));
  const remaining = Math.max(0, target - kcal);

  return (
    <div className="relative mx-auto h-44 w-44">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" strokeWidth="12" className="stroke-line" />
        <circle
          cx="80"
          cy="80"
          r={r}
          fill="none"
          strokeWidth="12"
          strokeLinecap="round"
          className="stroke-primary"
          strokeDasharray={`${base * c} ${c}`}
        />
        {over > 0 && (
          <circle
            cx="80"
            cy="80"
            r={r}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            className="stroke-fat"
            strokeDasharray={`${over * c} ${c}`}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="tnum text-3xl font-bold">{Math.round(kcal)}</span>
        <span className="text-xs text-muted">of {target} kcal</span>
        {ratio > 1 ? (
          <span className="tnum text-xs font-semibold text-fat">
            {Math.round(kcal - target)} over
          </span>
        ) : (
          <span className="tnum text-xs text-muted">{Math.round(remaining)} left</span>
        )}
      </div>
    </div>
  );
}
