import type { Meal, MealItem } from "@/db/schema";

export type MacroTotals = {
  kcal: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fibre_g: number;
  sugar_g: number;
};

export const ZERO_TOTALS: MacroTotals = {
  kcal: 0,
  protein_g: 0,
  carbs_g: 0,
  fat_g: 0,
  fibre_g: 0,
  sugar_g: 0,
};

export function addTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    kcal: a.kcal + b.kcal,
    protein_g: a.protein_g + b.protein_g,
    carbs_g: a.carbs_g + b.carbs_g,
    fat_g: a.fat_g + b.fat_g,
    fibre_g: a.fibre_g + b.fibre_g,
    sugar_g: a.sugar_g + b.sugar_g,
  };
}

/**
 * Single source of truth: totals sum final_* over items whose verdict is not
 * "removed". Callers decide which meals qualify (logged vs planned).
 */
export function itemsTotals(items: MealItem[]): MacroTotals {
  let t = ZERO_TOTALS;
  for (const item of items) {
    if (item.verdict === "removed") continue;
    t = addTotals(t, {
      kcal: item.finalKcal ?? 0,
      protein_g: item.finalProteinG ?? 0,
      carbs_g: item.finalCarbsG ?? 0,
      fat_g: item.finalFatG ?? 0,
      fibre_g: item.finalFibreG ?? 0,
      sugar_g: item.finalSugarG ?? 0,
    });
  }
  return t;
}

export type MealWithItems = Meal & { items: MealItem[] };

/** Totals for a day: logged meals only, removed items excluded. */
export function dayTotals(meals: MealWithItems[]): MacroTotals {
  let t = ZERO_TOTALS;
  for (const meal of meals) {
    if (meal.status !== "logged") continue;
    t = addTotals(t, itemsTotals(meal.items));
  }
  return t;
}
