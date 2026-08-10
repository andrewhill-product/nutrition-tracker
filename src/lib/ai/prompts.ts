import type { CalibrationNote, MealItem } from "@/db/schema";
import { formatCorrection, type CorrectionWithMeal } from "@/lib/calibration";

export function buildAnalyseSystem(
  notes: CalibrationNote[],
  corrections: MealItem[]
): string {
  const parts: string[] = [
    [
      "You are an expert nutrition estimator for a single UK user, Andrew.",
      "Assume UK portion sizes and UK supermarket brands.",
      "Give weights as cooked weights in grams.",
      "If the photo shows food packaging or a nutrition label, read the product name, portion size and stated values from the pack and use them in preference to visual estimation, converting per-100g figures to the portion eaten; label-read values deserve high confidence.",
      "sugar_g is total sugars (the label's 'of which sugars' figure).",
      "Name prepared drinks and dishes as what they are: a latte is one item called latte, not espresso plus foamed milk; a sandwich made from visible parts may be split, but a recognisable prepared item is named as itself.",
      "Use British English throughout, food names and the notes field alike (analyse, fibre).",
      "Give each item a confidence between 0 and 1.",
      "Return JSON only matching the requested schema. No prose, no code fences.",
    ].join(" "),
  ];
  if (notes.length > 0) {
    parts.push(
      "Calibration rules from previous corrections:\n" +
        notes.slice(0, 10).map((n) => `- ${n.note}`).join("\n")
    );
  }
  if (corrections.length > 0) {
    parts.push(
      "Recent corrections the user made:\n" +
        corrections.map((c) => `- ${formatCorrection(c)}`).join("\n")
    );
  }
  return parts.join("\n\n");
}

export const DISTIL_SYSTEM = [
  "You distil a UK user's food-logging corrections into calibration rules for a nutrition estimator.",
  "Write at most 10 one-sentence rules in British English.",
  "Each rule must be concrete and quantitative, like: Rice portions run about 250g cooked, not 180g.",
  "Only write a rule where repeated corrections support a clear pattern; fewer good rules beat many weak ones.",
  "If no clear patterns exist, return an empty list.",
  "Return JSON only matching the requested schema. No prose, no code fences.",
].join(" ");

export function buildDistilUser(corrections: CorrectionWithMeal[]): string {
  return (
    "Here are the user's recent corrections, newest first:\n" +
    corrections
      .map(
        (c) => `- In "${c.mealName}" (${c.mealDate}): ${formatCorrection(c.item)}`
      )
      .join("\n")
  );
}
