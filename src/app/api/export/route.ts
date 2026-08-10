import { asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { calibrationNotes, discardedAnalyses, mealItems, meals } from "@/db/schema";
import { buildExportCsv } from "@/lib/csv";
import { todayLondon } from "@/lib/dates";
import { getTargets } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET() {
  const allMeals = await db
    .select()
    .from(meals)
    .orderBy(asc(meals.date), asc(meals.id));
  const items =
    allMeals.length > 0
      ? await db
          .select()
          .from(mealItems)
          .where(inArray(mealItems.mealId, allMeals.map((m) => m.id)))
          .orderBy(asc(mealItems.id))
      : [];
  const withItems = allMeals.map((meal) => ({
    ...meal,
    items: items.filter((i) => i.mealId === meal.id),
  }));
  const [targetsRow, notes, discards] = await Promise.all([
    getTargets(),
    db.select().from(calibrationNotes).orderBy(asc(calibrationNotes.id)),
    db.select().from(discardedAnalyses).orderBy(asc(discardedAnalyses.id)),
  ]);
  const csv = buildExportCsv(withItems, targetsRow, notes, discards);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutrition-export-${todayLondon()}.csv"`,
    },
  });
}
