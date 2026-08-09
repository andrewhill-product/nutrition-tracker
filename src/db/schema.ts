import {
  boolean,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const slotEnum = pgEnum("slot", ["breakfast", "lunch", "dinner", "snack"]);
export const sourceEnum = pgEnum("source", ["photo", "spreadsheet", "manual"]);
export const statusEnum = pgEnum("status", ["logged", "planned"]);
export const verdictEnum = pgEnum("verdict", ["up", "edited", "removed"]);

export const meals = pgTable(
  "meals",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    slot: slotEnum("slot").notNull(),
    name: text("name").notNull(),
    source: sourceEnum("source").notNull(),
    status: statusEnum("status").notNull().default("logged"),
    photoUrl: text("photo_url"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("meals_date_idx").on(t.date), index("meals_date_status_idx").on(t.date, t.status)]
);

export const mealItems = pgTable(
  "meal_items",
  {
    id: serial("id").primaryKey(),
    mealId: integer("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    aiPortionDesc: text("ai_portion_desc"),
    aiGrams: integer("ai_grams"),
    aiKcal: integer("ai_kcal"),
    aiProteinG: real("ai_protein_g"),
    aiCarbsG: real("ai_carbs_g"),
    aiFatG: real("ai_fat_g"),
    aiFibreG: real("ai_fibre_g"),
    aiSugarG: real("ai_sugar_g"),
    aiConfidence: real("ai_confidence"),
    verdict: verdictEnum("verdict").notNull(),
    finalGrams: integer("final_grams"),
    finalKcal: integer("final_kcal"),
    finalProteinG: real("final_protein_g"),
    finalCarbsG: real("final_carbs_g"),
    finalFatG: real("final_fat_g"),
    finalFibreG: real("final_fibre_g"),
    finalSugarG: real("final_sugar_g"),
  },
  (t) => [index("meal_items_meal_id_idx").on(t.mealId), index("meal_items_verdict_idx").on(t.verdict)]
);

export const targets = pgTable("targets", {
  id: integer("id").primaryKey(),
  kcal: integer("kcal").notNull(),
  proteinG: integer("protein_g").notNull(),
  carbsG: integer("carbs_g").notNull(),
  fatG: integer("fat_g").notNull(),
  fibreG: integer("fibre_g").notNull(),
  // Ceiling, not a goal to reach. Tracks TOTAL sugars (the label's 'of
  // which sugars'); the UK label reference intake is 90g a day. The NHS 30g
  // limit is for free sugars, which labels do not declare separately.
  sugarG: integer("sugar_g").notNull().default(90),
});

export const calibrationNotes = pgTable("calibration_notes", {
  id: serial("id").primaryKey(),
  note: text("note").notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Meal = typeof meals.$inferSelect;
export type MealItem = typeof mealItems.$inferSelect;
export type Targets = typeof targets.$inferSelect;
export type CalibrationNote = typeof calibrationNotes.$inferSelect;
