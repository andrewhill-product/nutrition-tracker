import { and, desc, eq, ilike, inArray, isNotNull, or } from "drizzle-orm";
import { db } from "@/db";
import { mealItems, meals, type MealItem } from "@/db/schema";

/**
 * Only AI-estimated corrections feed calibration. Spreadsheet-supplied and
 * manual items have ai_confidence NULL, which these filters exclude.
 */
const correctionFilter = and(
  inArray(mealItems.verdict, ["edited", "removed"]),
  isNotNull(mealItems.aiKcal),
  isNotNull(mealItems.aiConfidence)
);

/** Text mode: match past corrections by words from the description. */
export async function getMatchingCorrections(description: string): Promise<MealItem[]> {
  const words = Array.from(
    new Set(
      description
        .toLowerCase()
        .split(/[^a-z]+/)
        .filter((w) => w.length >= 4)
    )
  ).slice(0, 8);
  if (words.length === 0) return getRecentCorrections();
  return db
    .select()
    .from(mealItems)
    .where(
      and(correctionFilter, or(...words.map((w) => ilike(mealItems.name, `%${w}%`))))
    )
    .orderBy(desc(mealItems.id))
    .limit(10);
}

/** Image mode: item names are unknown before the call, so use the 10 most recent. */
export async function getRecentCorrections(): Promise<MealItem[]> {
  return db
    .select()
    .from(mealItems)
    .where(correctionFilter)
    .orderBy(desc(mealItems.id))
    .limit(10);
}

export type CorrectionWithMeal = { item: MealItem; mealName: string; mealDate: string };

/** Distil input: the last 50 AI-estimated corrections, joined to their meals. */
export async function getCorrectionsForDistil(): Promise<CorrectionWithMeal[]> {
  const rows = await db
    .select({ item: mealItems, mealName: meals.name, mealDate: meals.date })
    .from(mealItems)
    .innerJoin(meals, eq(mealItems.mealId, meals.id))
    .where(correctionFilter)
    .orderBy(desc(mealItems.id))
    .limit(50);
  return rows;
}

function describeAi(item: MealItem): string {
  const grams = item.aiGrams !== null ? `${item.aiGrams}g` : "unknown weight";
  const macros = [
    item.aiKcal !== null ? `${item.aiKcal} kcal` : null,
    item.aiProteinG !== null ? `${item.aiProteinG}g protein` : null,
    item.aiCarbsG !== null ? `${item.aiCarbsG}g carbs` : null,
    item.aiFatG !== null ? `${item.aiFatG}g fat` : null,
    item.aiFibreG !== null ? `${item.aiFibreG}g fibre` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${item.name} at ${grams} (${macros})`;
}

function describeFinal(item: MealItem): string {
  const grams = item.finalGrams !== null ? `${item.finalGrams}g` : "unchanged weight";
  const macros = [
    item.finalKcal !== null ? `${item.finalKcal} kcal` : null,
    item.finalProteinG !== null ? `${item.finalProteinG}g protein` : null,
    item.finalCarbsG !== null ? `${item.finalCarbsG}g carbs` : null,
    item.finalFatG !== null ? `${item.finalFatG}g fat` : null,
    item.finalFibreG !== null ? `${item.finalFibreG}g fibre` : null,
  ]
    .filter(Boolean)
    .join(", ");
  return `${grams} (${macros})`;
}

/** "AI estimated X, Andrew corrected to Y" / "AI suggested X; Andrew removed it entirely". */
export function formatCorrection(item: MealItem): string {
  if (item.verdict === "removed") {
    return `AI suggested ${describeAi(item)}; Andrew removed it entirely.`;
  }
  return `AI estimated ${describeAi(item)}, Andrew corrected to ${describeFinal(item)}.`;
}
