import Link from "next/link";
import { itemsTotals, type MealWithItems } from "@/lib/totals";

/**
 * Dashed planned card. "Log it" opens conversion mode; the camera icon opens
 * capture with Dinner pre-selected (the slot picker is still shown). Renders
 * on past dates too.
 */
export function PlannedDinnerCard({ meal }: { meal: MealWithItems }) {
  const totals = itemsTotals(meal.items);
  return (
    <div className="rounded-2xl border-2 border-dashed border-line bg-surface p-3">
      <Link href={`/meal/${meal.id}`} className="block">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-primary">
              Planned
            </span>
            <p className="mt-1 truncate font-semibold">{meal.name}</p>
            {totals.kcal > 0 && (
              <p className="tnum text-xs text-muted">
                About {Math.round(totals.kcal)} kcal
              </p>
            )}
          </div>
        </div>
      </Link>
      <div className="mt-3 flex gap-2">
        <Link
          href={`/meal/${meal.id}?convert=1`}
          className="flex h-11 flex-1 items-center justify-center rounded-xl bg-primary text-sm font-semibold text-on-primary"
        >
          Log it
        </Link>
        <Link
          href={`/today?date=${meal.date}&capture=photo&slot=dinner&convert=${meal.id}`}
          aria-label="Log from a fresh photo"
          className="flex h-11 w-12 items-center justify-center rounded-xl bg-surface2 text-lg"
        >
          📷
        </Link>
      </div>
    </div>
  );
}
