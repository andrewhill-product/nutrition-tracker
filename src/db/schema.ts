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

// "dinner" is displayed as "Tea" throughout the UI (src/lib/slots.ts).
export const slotEnum = pgEnum("slot", ["breakfast", "lunch", "dinner", "snack", "drink"]);
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
    // Singular count unit for naturally counted items ("egg", "slice");
    // null for weighed foods. Set by the analyser, never edited directly.
    unit: text("unit"),
    aiPortionDesc: text("ai_portion_desc"),
    aiCount: real("ai_count"),
    aiGrams: integer("ai_grams"),
    aiKcal: integer("ai_kcal"),
    aiProteinG: real("ai_protein_g"),
    aiCarbsG: real("ai_carbs_g"),
    aiFatG: real("ai_fat_g"),
    aiFibreG: real("ai_fibre_g"),
    aiSugarG: real("ai_sugar_g"),
    aiConfidence: real("ai_confidence"),
    verdict: verdictEnum("verdict").notNull(),
    finalCount: real("final_count"),
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
  // Whether body weight from Apple Health appears anywhere in the UI.
  showWeight: boolean("show_weight").notNull().default(true),
});

/**
 * Repeat meals: templates of already-reviewed meals for one-tap re-logging.
 * They store final (human-approved) values only, so replaying one costs no
 * AI call and never feeds calibration.
 */
export const repeats = pgTable("repeats", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slot: slotEnum("slot").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const repeatItems = pgTable("repeat_items", {
  id: serial("id").primaryKey(),
  repeatId: integer("repeat_id")
    .notNull()
    .references(() => repeats.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  grams: integer("grams"),
  kcal: integer("kcal").notNull(),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fibreG: real("fibre_g"),
  sugarG: real("sugar_g"),
});

/**
 * Analyses Andrew binned without saving: the review screen records what the
 * AI proposed and (optionally) what the meal actually was, so distil can
 * learn identification mistakes that never reach meal_items.
 */
export const discardedAnalyses = pgTable("discarded_analyses", {
  id: serial("id").primaryKey(),
  // "photo" or "text": what kind of analysis was binned, so distil never
  // blames the camera for a misread description.
  source: text("source").notNull().default("photo"),
  aiMealName: text("ai_meal_name").notNull(),
  aiItemsSummary: text("ai_items_summary").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * One row per day of activity, entered by hand on the Today view (steps,
 * exercises). Every metric is nullable and nothing breaks when absent. The
 * extra columns (energy, heart rate, weight) survive from the abandoned
 * Apple Health sync and still display if rows carry them.
 */
export const dailyActivity = pgTable("daily_activity", {
  date: date("date", { mode: "string" }).primaryKey(),
  steps: integer("steps"),
  activeKcal: integer("active_kcal"),
  restingKcal: integer("resting_kcal"),
  exerciseMinutes: integer("exercise_minutes"),
  restingHr: integer("resting_hr"),
  weightKg: real("weight_kg"),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Individual exercises (Gym, Padel, Running...), replaced wholesale per date
 * on each save so editing never duplicates rows. Calories and duration are
 * both optional: an exercise with just a name is still worth recording.
 */
export const workouts = pgTable(
  "workouts",
  {
    id: serial("id").primaryKey(),
    date: date("date", { mode: "string" }).notNull(),
    activityType: text("activity_type").notNull(),
    durationMin: integer("duration_min"),
    activeKcal: integer("active_kcal"),
    startedAt: text("started_at"),
  },
  (t) => [index("workouts_date_idx").on(t.date)]
);

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
export type DiscardedAnalysis = typeof discardedAnalyses.$inferSelect;
export type Repeat = typeof repeats.$inferSelect;
export type RepeatItem = typeof repeatItems.$inferSelect;
export type DailyActivity = typeof dailyActivity.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
