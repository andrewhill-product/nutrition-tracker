import type { CalibrationNote, MealItem, Targets } from "@/db/schema";
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
  "meal_created_at", "item_id", "item_name", "ai_portion_desc", "ai_grams", "ai_kcal",
  "ai_protein_g", "ai_carbs_g", "ai_fat_g", "ai_fibre_g", "ai_confidence", "verdict",
  "final_grams", "final_kcal", "final_protein_g", "final_carbs_g", "final_fat_g",
  "final_fibre_g",
];

function mealItemRow(meal: MealWithItems, item: MealItem): string {
  return row([
    meal.id, meal.date, meal.slot, meal.name, meal.source, meal.status, meal.photoUrl,
    meal.notes, meal.createdAt.toISOString(), item.id, item.name, item.aiPortionDesc,
    item.aiGrams, item.aiKcal, item.aiProteinG, item.aiCarbsG, item.aiFatG, item.aiFibreG,
    item.aiConfidence, item.verdict, item.finalGrams, item.finalKcal, item.finalProteinG,
    item.finalCarbsG, item.finalFatG, item.finalFibreG,
  ]);
}

/**
 * One CSV, three labelled sections (meals x items, targets, calibration notes),
 * separated by blank lines. UTF-8 BOM so Excel opens it correctly.
 */
export function buildExportCsv(
  meals: MealWithItems[],
  targetsRow: Targets,
  notes: CalibrationNote[]
): string {
  const lines: string[] = [];
  lines.push("# meals");
  lines.push(row(MEAL_ITEM_HEADER));
  for (const meal of meals) {
    for (const item of meal.items) lines.push(mealItemRow(meal, item));
  }
  lines.push("");
  lines.push("# targets");
  lines.push(row(["kcal", "protein_g", "carbs_g", "fat_g", "fibre_g"]));
  lines.push(
    row([targetsRow.kcal, targetsRow.proteinG, targetsRow.carbsG, targetsRow.fatG, targetsRow.fibreG])
  );
  lines.push("");
  lines.push("# calibration_notes");
  lines.push(row(["id", "note", "active", "created_at"]));
  for (const note of notes) {
    lines.push(row([note.id, note.note, note.active, note.createdAt.toISOString()]));
  }
  return "\uFEFF" + lines.join("\r\n") + "\r\n";
}
