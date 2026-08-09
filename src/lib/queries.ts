import { and, asc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  calibrationNotes,
  mealItems,
  meals,
  targets,
  type CalibrationNote,
  type Targets,
} from "@/db/schema";
import { addDays } from "./dates";
import type { MealWithItems } from "./totals";

async function withItems(rows: (typeof meals.$inferSelect)[]): Promise<MealWithItems[]> {
  if (rows.length === 0) return [];
  const items = await db
    .select()
    .from(mealItems)
    .where(inArray(mealItems.mealId, rows.map((m) => m.id)))
    .orderBy(asc(mealItems.id));
  return rows.map((meal) => ({
    ...meal,
    items: items.filter((i) => i.mealId === meal.id),
  }));
}

const SLOT_ORDER = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 } as const;

/** All meals for a date, logged and planned, slot-ordered. */
export async function getDay(date: string): Promise<MealWithItems[]> {
  const rows = await db
    .select()
    .from(meals)
    .where(eq(meals.date, date))
    .orderBy(asc(meals.createdAt));
  const withItemsRows = await withItems(rows);
  return withItemsRows.sort((a, b) => SLOT_ORDER[a.slot] - SLOT_ORDER[b.slot]);
}

/** All meals in an inclusive date range. */
export async function getRange(start: string, end: string): Promise<MealWithItems[]> {
  const rows = await db
    .select()
    .from(meals)
    .where(and(gte(meals.date, start), lte(meals.date, end)))
    .orderBy(asc(meals.date), asc(meals.createdAt));
  return withItems(rows);
}

/** All meals for the 7 days starting at `start` (a Monday). */
export async function getWeek(start: string): Promise<MealWithItems[]> {
  return getRange(start, addDays(start, 6));
}

export async function getMeal(id: number): Promise<MealWithItems | null> {
  const rows = await db.select().from(meals).where(eq(meals.id, id)).limit(1);
  if (rows.length === 0) return null;
  const [meal] = await withItems(rows);
  return meal;
}

export async function getTargets(): Promise<Targets> {
  const rows = await db.select().from(targets).where(eq(targets.id, 1)).limit(1);
  return (
    rows[0] ?? {
      id: 1,
      kcal: 2250,
      proteinG: 140,
      carbsG: 230,
      fatG: 75,
      fibreG: 30,
      sugarG: 90,
    }
  );
}

export async function getActiveNotes(): Promise<CalibrationNote[]> {
  return db
    .select()
    .from(calibrationNotes)
    .where(eq(calibrationNotes.active, true))
    .orderBy(asc(calibrationNotes.id));
}

/** Dates that already have a planned dinner (import shows a replaces flag). */
export async function getPlannedDinnerDates(): Promise<string[]> {
  const rows = await db
    .select({ date: meals.date })
    .from(meals)
    .where(and(eq(meals.slot, "dinner"), eq(meals.status, "planned")));
  return rows.map((r) => r.date);
}
