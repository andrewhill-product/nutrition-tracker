/* eslint-disable @next/next/no-img-element */

import Link from "next/link";
import type { Source } from "@/lib/schemas";
import { itemsTotals, type MealWithItems } from "@/lib/totals";

const SOURCE_LABEL: Record<Source, string> = {
  photo: "From a photo",
  manual: "Typed in",
  spreadsheet: "From your meal plan",
};

export function MealCard({ meal }: { meal: MealWithItems }) {
  const totals = itemsTotals(meal.items);
  return (
    <Link
      href={`/meal/${meal.id}`}
      className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3 active:bg-surface2"
    >
      {meal.photoUrl ? (
        <img
          src={meal.photoUrl}
          alt=""
          className="h-14 w-14 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface2 text-xl">
          🍽️
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{meal.name}</p>
        <p className="tnum truncate text-xs text-muted">
          <span className="text-protein">P {Math.round(totals.protein_g)}</span>
          {" · "}
          <span className="text-carbs">C {Math.round(totals.carbs_g)}</span>
          {" · "}
          <span className="text-fat">F {Math.round(totals.fat_g)}</span>
          {" · "}
          <span className="text-fibre">Fb {Math.round(totals.fibre_g)}</span>
        </p>
        <p className="text-xs text-muted">{SOURCE_LABEL[meal.source]}</p>
      </div>
      <span className="tnum shrink-0 font-bold">{Math.round(totals.kcal)}</span>
    </Link>
  );
}
