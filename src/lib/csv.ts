import type {
  CalibrationNote,
  DiscardedAnalysis,
  MealItem,
  Targets,
} from "@/db/schema";
import type { MealWithItems } from "./totals";

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  // Defuse spreadsheet formula injection: text cells cannot start with a
  // formula trigger character (imported or AI-written names are untrusted).
  if (typeof value === "string" && /^[=+@\t\r-]/.test(s)) s = "'" + s;
  if (/[",\r\n]/.test(s)) return `"${s.replaceAll(`"`, `""`)}"`;
  return s;
}

function row(cells: unknown[]): string {
  return cells.map(escapeCell).join(",");
}

const MEAL_ITEM_HEADER = [
  "meal_id", "date", "slot", "meal_name", "source", "status", "photo_url", "meal_notes",
  "meal_created_at", "item_id", "item_name", "unit", "ai_portion_desc", "ai_count",
  "ai_grams", "ai_kcal",
  "ai_protein_g", "ai_carbs_g", "ai_fat_g", "ai_fibre_g", "ai_sugar_g", "ai_confidence",
  "verdict", "final_count", "final_grams", "final_kcal", "final_protein_g", "final_carbs_g",
  "final_fat_g", "final_fibre_g", "final_sugar_g",
];

function mealItemRow(meal: MealWithItems, item: MealItem): string {
  return row([
    meal.id, meal.date, meal.slot, meal.name, meal.source, meal.status, meal.photoUrl,
    meal.notes, meal.createdAt.toISOString(), item.id, item.name, item.unit,
    item.aiPortionDesc, item.aiCount,
    item.aiGrams, item.aiKcal, item.aiProteinG, item.aiCarbsG, item.aiFatG, item.aiFibreG,
    item.aiSugarG, item.aiConfidence, item.verdict, item.finalCount, item.finalGrams, item.finalKcal,
    item.finalProteinG, item.finalCarbsG, item.finalFatG, item.finalFibreG, item.finalSugarG,
  ]);
}

/**
 * One CSV, three labelled sections (meals x items, targets, calibration notes),
 * separated by blank lines. UTF-8 BOM so Excel opens it correctly.
 */
export function buildExportCsv(
  meals: MealWithItems[],
  targetsRow: Targets,
  notes: CalibrationNote[],
  discards: DiscardedAnalysis[] = []
): string {
  const lines: string[] = [];
  lines.push("# meals");
  lines.push(row(MEAL_ITEM_HEADER));
  for (const meal of meals) {
    for (const item of meal.items) lines.push(mealItemRow(meal, item));
  }
  lines.push("");
  lines.push("# targets");
  lines.push(row(["kcal", "protein_g", "carbs_g", "fat_g", "fibre_g", "sugar_g"]));
  lines.push(
    row([targetsRow.kcal, targetsRow.proteinG, targetsRow.carbsG, targetsRow.fatG, targetsRow.fibreG, targetsRow.sugarG])
  );
  lines.push("");
  lines.push("# calibration_notes");
  lines.push(row(["id", "note", "active", "created_at"]));
  for (const note of notes) {
    lines.push(row([note.id, note.note, note.active, note.createdAt.toISOString()]));
  }
  lines.push("");
  lines.push("# discarded_analyses");
  lines.push(row(["id", "source", "ai_meal_name", "ai_items_summary", "note", "created_at"]));
  for (const d of discards) {
    lines.push(
      row([d.id, d.source, d.aiMealName, d.aiItemsSummary, d.note, d.createdAt.toISOString()])
    );
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
