/**
 * Idempotent seed: upserts the targets row, and only when the meals table is
 * empty inserts 3 logged example meals and 2 planned dinners. Rerunning is a
 * no-op; it never truncates.
 *
 * The seeded "corrections" (2 edited, 1 removed) are generically true UK
 * portion facts so they cannot mis-calibrate. Deleting the example meals
 * removes their influence on calibration.
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { mealItems, meals, targets } from "../src/db/schema";
import { addDays, todayLondon } from "../src/lib/dates";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("seed: DATABASE_URL is not set. Run via `npm run seed` with .env.local in place.");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });
const db = drizzle(pool);

type ItemSeed = typeof mealItems.$inferInsert;

async function main() {
  await db
    .insert(targets)
    .values({ id: 1, kcal: 2250, proteinG: 140, carbsG: 230, fatG: 75, fibreG: 30, sugarG: 90 })
    .onConflictDoNothing();

  const existing = await db.select({ id: meals.id }).from(meals).limit(1);
  if (existing.length > 0) {
    console.log("seed: meals already present, nothing to do.");
    return;
  }

  const today = todayLondon();
  const yesterday = addDays(today, -1);

  const insertMeal = async (
    meal: typeof meals.$inferInsert,
    items: Omit<ItemSeed, "mealId">[]
  ) => {
    const [created] = await db.insert(meals).values(meal).returning({ id: meals.id });
    await db.insert(mealItems).values(items.map((i) => ({ ...i, mealId: created.id })));
  };

  const up = (
    name: string,
    portion: string,
    grams: number,
    kcal: number,
    protein: number,
    carbs: number,
    fat: number,
    fibre: number,
    sugar: number,
    confidence: number
  ): Omit<ItemSeed, "mealId"> => ({
    name,
    aiPortionDesc: portion,
    aiGrams: grams,
    aiKcal: kcal,
    aiProteinG: protein,
    aiCarbsG: carbs,
    aiFatG: fat,
    aiFibreG: fibre,
    aiSugarG: sugar,
    aiConfidence: confidence,
    verdict: "up",
    finalGrams: grams,
    finalKcal: kcal,
    finalProteinG: protein,
    finalCarbsG: carbs,
    finalFatG: fat,
    finalFibreG: fibre,
    finalSugarG: sugar,
  });

  await insertMeal(
    {
      date: today,
      slot: "breakfast",
      name: "Porridge with blueberries",
      source: "manual",
      status: "logged",
      notes: "Example meal added by the seed script.",
    },
    [
      up("Porridge oats", "1 standard bowl, made with water", 60, 225, 6.6, 36, 4.8, 5.4, 0.7, 0.85),
      up("Semi-skimmed milk", "Splash on top, about 100ml", 100, 50, 3.6, 4.8, 1.8, 0, 4.8, 0.8),
      up("Blueberries", "1 handful", 80, 45, 0.7, 9, 0.2, 1.2, 7.8, 0.75),
    ]
  );

  await insertMeal(
    {
      date: today,
      slot: "lunch",
      name: "Chicken salad sandwich",
      source: "photo",
      status: "logged",
      notes: "Example meal added by the seed script.",
    },
    [
      up("Roast chicken breast", "Sliced, sandwich filling", 90, 145, 27, 0, 3.6, 0, 0, 0.8),
      {
        // Edited: generically true UK fact, wholemeal medium slices run ~40g each.
        name: "Wholemeal bread",
        aiPortionDesc: "2 thin slices",
        aiGrams: 60,
        aiKcal: 130,
        aiProteinG: 6,
        aiCarbsG: 24,
        aiFatG: 1.6,
        aiFibreG: 4.2,
        aiSugarG: 2.8,
        aiConfidence: 0.7,
        verdict: "edited",
        finalGrams: 80,
        finalKcal: 174,
        finalProteinG: 8,
        finalCarbsG: 32,
        finalFatG: 2.2,
        finalFibreG: 5.6,
        finalSugarG: 3.7,
      },
      {
        // Removed: the AI guessed butter that was not there.
        name: "Butter",
        aiPortionDesc: "Thin spread on both slices",
        aiGrams: 10,
        aiKcal: 74,
        aiProteinG: 0.1,
        aiCarbsG: 0.1,
        aiFatG: 8.2,
        aiFibreG: 0,
        aiSugarG: 0.1,
        aiConfidence: 0.5,
        verdict: "removed",
      },
      up("Mixed salad", "Lettuce, cucumber and tomato on the side", 70, 15, 0.8, 2.5, 0.2, 1, 1.6, 0.65),
    ]
  );

  await insertMeal(
    {
      date: yesterday,
      slot: "dinner",
      name: "Chicken tikka with rice",
      source: "photo",
      status: "logged",
      notes: "Example meal added by the seed script.",
    },
    [
      up("Chicken tikka", "Grilled pieces, restaurant portion", 180, 265, 43, 5, 8, 1, 3.5, 0.75),
      {
        // Edited: generically true UK fact, a cooked rice portion is nearer 250g than 180g.
        name: "Basmati rice",
        aiPortionDesc: "1 serving, cooked",
        aiGrams: 180,
        aiKcal: 250,
        aiProteinG: 5.6,
        aiCarbsG: 55,
        aiFatG: 0.7,
        aiFibreG: 0.7,
        aiSugarG: 0.3,
        aiConfidence: 0.7,
        verdict: "edited",
        finalGrams: 250,
        finalKcal: 348,
        finalProteinG: 7.8,
        finalCarbsG: 76,
        finalFatG: 1,
        finalFibreG: 1,
        finalSugarG: 0.4,
      },
      up("Cucumber raita", "2 tablespoons", 40, 25, 1.4, 2, 1.2, 0.2, 1.5, 0.6),
    ]
  );

  // Planned dinners: spreadsheet provenance, so ai_confidence stays NULL and
  // the placeholder verdict never feeds calibration. Conversion mode collects
  // real verdicts before these count anywhere.
  const planned = (
    date: string,
    name: string,
    itemName: string,
    grams: number,
    kcal: number,
    protein: number,
    carbs: number,
    fat: number,
    fibre: number,
    sugar: number
  ) =>
    insertMeal(
      { date, slot: "dinner", name, source: "spreadsheet", status: "planned" },
      [
        {
          name: itemName,
          aiPortionDesc: "Planned portion from the meal plan",
          aiGrams: grams,
          aiKcal: kcal,
          aiProteinG: protein,
          aiCarbsG: carbs,
          aiFatG: fat,
          aiFibreG: fibre,
          aiSugarG: sugar,
          aiConfidence: null,
          verdict: "up",
          finalGrams: grams,
          finalKcal: kcal,
          finalProteinG: protein,
          finalCarbsG: carbs,
          finalFatG: fat,
          finalFibreG: fibre,
          finalSugarG: sugar,
        },
      ]
    );

  await planned(addDays(today, 1), "Spaghetti bolognese", "Spaghetti bolognese", 450, 620, 32, 78, 18, 7, 12);
  await planned(addDays(today, 2), "Salmon with new potatoes", "Salmon fillet with new potatoes and greens", 400, 560, 38, 42, 24, 6, 4);

  console.log("seed: created targets, 3 logged meals and 2 planned dinners.");
}

main()
  .then(async () => {
    await pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
