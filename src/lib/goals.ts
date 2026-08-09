import type { Targets } from "@/db/schema";
import type { MacroTotals } from "./totals";

/**
 * Direction-aware goal engine, the single source of truth for Insights.
 * Ceilings (kcal, carbs, fat, sugar) are budgets to stay under; floors
 * (protein, fibre) are minimums to reach. A percentage never renders the same
 * way for both directions, and Insights copy states facts, not verdicts.
 */

export type GoalKey = "kcal" | "protein" | "carbs" | "fat" | "fibre" | "sugar";
export type Direction = "ceiling" | "floor" | "band";
export type GoalStatus = "hit" | "near" | "off";
export type DayState = "empty" | "incomplete" | "on-track" | "near-miss" | "off-track";

export type GoalMeta = {
  key: GoalKey;
  label: string;
  unit: string;
  direction: Direction;
  colorText: string;
  colorBg: string;
};

export const GOALS: GoalMeta[] = [
  { key: "kcal", label: "Calories", unit: "kcal", direction: "band", colorText: "text-primary", colorBg: "bg-primary" },
  { key: "protein", label: "Protein", unit: "g", direction: "floor", colorText: "text-protein", colorBg: "bg-protein" },
  { key: "carbs", label: "Carbs", unit: "g", direction: "band", colorText: "text-carbs", colorBg: "bg-carbs" },
  { key: "fat", label: "Fat", unit: "g", direction: "band", colorText: "text-fat", colorBg: "bg-fat" },
  { key: "fibre", label: "Fibre", unit: "g", direction: "floor", colorText: "text-fibre", colorBg: "bg-fibre" },
  { key: "sugar", label: "Sugar", unit: "g", direction: "ceiling", colorText: "text-sugar", colorBg: "bg-sugar" },
];

export function goalValue(totals: MacroTotals, key: GoalKey): number {
  switch (key) {
    case "kcal": return totals.kcal;
    case "protein": return totals.protein_g;
    case "carbs": return totals.carbs_g;
    case "fat": return totals.fat_g;
    case "fibre": return totals.fibre_g;
    case "sugar": return totals.sugar_g;
  }
}

export function goalTarget(targets: Targets, key: GoalKey): number {
  switch (key) {
    case "kcal": return targets.kcal;
    case "protein": return targets.proteinG;
    case "carbs": return targets.carbsG;
    case "fat": return targets.fatG;
    case "fibre": return targets.fibreG;
    case "sugar": return targets.sugarG;
  }
}

/**
 * Bands (calories, carbs, fat): the green zone is 90% to 105% of target,
 * near-miss from 75% under or to 125% over, off beyond either. Ceilings
 * (sugar): green anywhere at or under 105% of the limit, near-miss to 125%,
 * off beyond (a 25% overrun is serious). Floors (protein, fibre): green from
 * 90%, near-miss from 75%, off below; exceeding a floor never penalises.
 */
export function goalStatus(direction: Direction, value: number, target: number): GoalStatus {
  if (target <= 0) return "hit";
  const ratio = value / target;
  if (direction === "ceiling") {
    if (ratio <= 1.05) return "hit";
    if (ratio <= 1.25) return "near";
    return "off";
  }
  if (direction === "band") {
    if (ratio >= 0.9 && ratio <= 1.05) return "hit";
    if (ratio >= 0.75 && ratio <= 1.25) return "near";
    return "off";
  }
  if (ratio >= 0.9) return "hit";
  if (ratio >= 0.75) return "near";
  return "off";
}

/**
 * Day scoring. A day with nothing logged is empty; a day with fewer than 2
 * meals or under 50% of the calorie target is incomplete and never scores as
 * a hit or a miss. The headline verdict uses calories and protein only; the
 * other goals are reported as a count and never gate the badge.
 */
export function dayState(
  totals: MacroTotals,
  loggedMealCount: number,
  targets: Targets
): DayState {
  if (loggedMealCount === 0) return "empty";
  if (loggedMealCount < 2 || totals.kcal < targets.kcal * 0.5) return "incomplete";
  const kcal = goalStatus("band", totals.kcal, targets.kcal);
  const protein = goalStatus("floor", totals.protein_g, targets.proteinG);
  if (kcal === "off" || protein === "off") return "off-track";
  if (kcal === "hit" && protein === "hit") return "on-track";
  return "near-miss";
}

/** How many of the 6 goals a day hit (ceilings within limit, floors reached). */
export function goalsHit(totals: MacroTotals, targets: Targets): number {
  return GOALS.filter(
    (g) => goalStatus(g.direction, goalValue(totals, g.key), goalTarget(targets, g.key)) === "hit"
  ).length;
}
