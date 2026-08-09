/**
 * Average macro split by energy share (protein 4, carbs 4, fat 9 kcal per
 * gram), fibre as grams, over days with at least 1 logged meal.
 */
export function MacroSplitCard({
  protein,
  carbs,
  fat,
  fibre,
  daysCounted,
}: {
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  daysCounted: number;
}) {
  const energy = protein * 4 + carbs * 4 + fat * 9;
  const pct = (v: number) => (energy > 0 ? Math.round((v / energy) * 100) : 0);
  const shares = [
    { label: "Protein", grams: protein, pct: pct(protein * 4), color: "bg-protein" },
    { label: "Carbs", grams: carbs, pct: pct(carbs * 4), color: "bg-carbs" },
    { label: "Fat", grams: fat, pct: pct(fat * 9), color: "bg-fat" },
  ];

  if (daysCounted === 0) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-4 text-sm text-muted">
        Average macro split appears once a day has logged meals.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="font-semibold">Average macro split</h2>
        <span className="text-xs text-muted">
          {daysCounted} {daysCounted === 1 ? "day" : "days"}
        </span>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-line">
        {shares.map((s) => (
          <div key={s.label} className={s.color} style={{ width: `${s.pct}%` }} />
        ))}
      </div>
      <div className="tnum grid grid-cols-4 gap-2 text-center text-xs">
        {shares.map((s) => (
          <div key={s.label}>
            <p className="font-semibold">{s.pct}%</p>
            <p className="text-muted">
              {s.label} {Math.round(s.grams)}g
            </p>
          </div>
        ))}
        <div>
          <p className="font-semibold">{Math.round(fibre)}g</p>
          <p className="text-muted">Fibre a day</p>
        </div>
      </div>
    </div>
  );
}
