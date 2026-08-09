const BARS = [
  { key: "protein", label: "Protein", color: "bg-protein" },
  { key: "carbs", label: "Carbs", color: "bg-carbs" },
  { key: "fat", label: "Fat", color: "bg-fat" },
  { key: "fibre", label: "Fibre", color: "bg-fibre" },
  { key: "sugar", label: "Sugar", color: "bg-sugar" },
] as const;

export function MacroBars({
  values,
  targets,
}: {
  values: { protein: number; carbs: number; fat: number; fibre: number; sugar: number };
  targets: { protein: number; carbs: number; fat: number; fibre: number; sugar: number };
}) {
  return (
    <div className="space-y-2.5">
      {BARS.map((bar) => {
        const value = values[bar.key];
        const target = targets[bar.key];
        const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
        return (
          <div key={bar.key}>
            <div className="mb-1 flex items-baseline justify-between text-xs">
              <span className="font-medium">{bar.label}</span>
              <span className="tnum text-muted">
                {Math.round(value)} / {target}g
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className={`h-full rounded-full ${bar.color}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
