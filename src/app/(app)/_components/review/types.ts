import type {
  AnalysisItemT,
  AnalysisResultT,
  Slot,
  Source,
  Status,
  Verdict,
} from "@/lib/schemas";
import type { MealWithItems } from "@/lib/totals";

export type MacroKey = "kcal" | "protein" | "carbs" | "fat" | "fibre" | "sugar";

export type AiValues = {
  portionDesc: string | null;
  count: number | null;
  grams: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fibre: number | null;
  sugar: number | null;
  confidence: number | null;
};

export type FinalValues = {
  count: number | null;
  grams: number | null;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fibre: number | null;
  sugar: number | null;
};

export type ReviewItem = {
  key: string;
  dbId?: number;
  name: string;
  /** Singular count unit ("egg", "slice") for countable items, else null. */
  unit: string | null;
  ai: AiValues;
  /** null = not yet reviewed; the Save gate requires every verdict set. */
  verdict: Verdict | null;
  final: FinalValues;
  /** Macros individually pinned so grams changes stop scaling them. */
  overridden: Partial<Record<Exclude<MacroKey, "kcal">, boolean>> & {
    kcal?: boolean;
  };
};

export type ReviewMode = "draft" | "edit" | "conversion";

export type ReviewDraft = {
  mealId?: number;
  mode: ReviewMode;
  date: string;
  slot: Slot;
  name: string;
  source: Source;
  status: Status;
  photoUrl: string | null;
  aiNotes: string | null;
  items: ReviewItem[];
};

let keyCounter = 0;
export function nextKey(): string {
  keyCounter += 1;
  return `item-${keyCounter}`;
}

export function itemFromAnalysis(a: AnalysisItemT): ReviewItem {
  return {
    key: nextKey(),
    name: a.name,
    unit: a.unit ?? null,
    ai: {
      portionDesc: a.portion_desc,
      count: a.count ?? null,
      grams: a.grams,
      kcal: a.kcal,
      protein: a.protein_g,
      carbs: a.carbs_g,
      fat: a.fat_g,
      fibre: a.fibre_g,
      sugar: a.sugar_g,
      confidence: a.confidence,
    },
    verdict: null,
    final: {
      count: a.count ?? null,
      grams: a.grams,
      kcal: a.kcal,
      protein: a.protein_g,
      carbs: a.carbs_g,
      fat: a.fat_g,
      fibre: a.fibre_g,
      sugar: a.sugar_g,
    },
    overridden: {},
  };
}

export function draftFromAnalysis(
  result: AnalysisResultT,
  opts: { date: string; slot: Slot; source: Source; photoUrl: string | null }
): ReviewDraft {
  return {
    mode: "draft",
    date: opts.date,
    slot: opts.slot,
    name: result.meal_name || "Meal",
    source: opts.source,
    status: "logged",
    photoUrl: opts.photoUrl,
    aiNotes: result.notes || null,
    items: result.items.map(itemFromAnalysis),
  };
}

export function emptyDraft(opts: {
  date: string;
  slot: Slot;
  source: Source;
  photoUrl?: string | null;
}): ReviewDraft {
  return {
    mode: "draft",
    date: opts.date,
    slot: opts.slot,
    name: "Meal",
    source: opts.source,
    status: "logged",
    photoUrl: opts.photoUrl ?? null,
    aiNotes: null,
    items: [],
  };
}

export function draftFromMeal(
  meal: MealWithItems,
  mode: "edit" | "conversion"
): ReviewDraft {
  return {
    mealId: meal.id,
    mode,
    date: meal.date,
    slot: meal.slot,
    name: meal.name,
    source: meal.source,
    status: meal.status,
    photoUrl: meal.photoUrl,
    aiNotes: meal.notes,
    items: meal.items.map((item) => ({
      key: nextKey(),
      dbId: item.id,
      name: item.name,
      unit: item.unit,
      ai: {
        portionDesc: item.aiPortionDesc,
        count: item.aiCount,
        grams: item.aiGrams,
        kcal: item.aiKcal,
        protein: item.aiProteinG,
        carbs: item.aiCarbsG,
        fat: item.aiFatG,
        fibre: item.aiFibreG,
        sugar: item.aiSugarG,
        confidence: item.aiConfidence,
      },
      // Conversion mode resets every verdict to unreviewed: the stored
      // placeholder "up" from import is never trusted as a real review.
      verdict: mode === "conversion" ? null : item.verdict,
      final:
        item.verdict === "removed" || mode === "conversion"
          ? {
              count: item.finalCount ?? item.aiCount,
              grams: item.finalGrams ?? item.aiGrams,
              kcal: item.finalKcal ?? item.aiKcal,
              protein: item.finalProteinG ?? item.aiProteinG,
              carbs: item.finalCarbsG ?? item.aiCarbsG,
              fat: item.finalFatG ?? item.aiFatG,
              fibre: item.finalFibreG ?? item.aiFibreG,
              sugar: item.finalSugarG ?? item.aiSugarG,
            }
          : {
              count: item.finalCount,
              grams: item.finalGrams,
              kcal: item.finalKcal,
              protein: item.finalProteinG,
              carbs: item.finalCarbsG,
              fat: item.finalFatG,
              fibre: item.finalFibreG,
              sugar: item.finalSugarG,
            },
      overridden: {},
    })),
  };
}

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

/** Linear scaling from the AI baseline for macros not individually pinned. */
export function scaleFinals(item: ReviewItem, grams: number): FinalValues {
  const { ai, overridden, final } = item;
  if (!ai.grams || ai.grams <= 0) return { ...final, grams };
  const factor = grams / ai.grams;
  return {
    count: ai.count !== null ? round1(ai.count * factor) : final.count,
    grams,
    kcal: overridden.kcal
      ? final.kcal
      : ai.kcal !== null
        ? Math.round(ai.kcal * factor)
        : final.kcal,
    protein: overridden.protein
      ? final.protein
      : ai.protein !== null
        ? round1(ai.protein * factor)
        : final.protein,
    carbs: overridden.carbs
      ? final.carbs
      : ai.carbs !== null
        ? round1(ai.carbs * factor)
        : final.carbs,
    fat: overridden.fat
      ? final.fat
      : ai.fat !== null
        ? round1(ai.fat * factor)
        : final.fat,
    fibre: overridden.fibre
      ? final.fibre
      : ai.fibre !== null
        ? round1(ai.fibre * factor)
        : final.fibre,
    sugar: overridden.sugar
      ? final.sugar
      : ai.sugar !== null
        ? round1(ai.sugar * factor)
        : final.sugar,
  };
}

export type LiveTotals = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fibre: number;
  sugar: number;
};

/** Live footer totals over items that are not removed. */
export function liveTotals(items: ReviewItem[]): LiveTotals {
  const t: LiveTotals = { kcal: 0, protein: 0, carbs: 0, fat: 0, fibre: 0, sugar: 0 };
  for (const item of items) {
    if (item.verdict === "removed") continue;
    t.kcal += item.final.kcal ?? 0;
    t.protein += item.final.protein ?? 0;
    t.carbs += item.final.carbs ?? 0;
    t.fat += item.final.fat ?? 0;
    t.fibre += item.final.fibre ?? 0;
    t.sugar += item.final.sugar ?? 0;
  }
  return t;
}

type PayloadItem = {
  id?: number;
  name: string;
  unit: string | null;
  ai_portion_desc: string | null;
  ai_count: number | null;
  ai_grams: number | null;
  ai_kcal: number | null;
  ai_protein_g: number | null;
  ai_carbs_g: number | null;
  ai_fat_g: number | null;
  ai_fibre_g: number | null;
  ai_sugar_g: number | null;
  ai_confidence: number | null;
  verdict: Verdict;
  final_count: number | null;
  final_grams: number | null;
  final_kcal: number | null;
  final_protein_g: number | null;
  final_carbs_g: number | null;
  final_fat_g: number | null;
  final_fibre_g: number | null;
  final_sugar_g: number | null;
};

/**
 * Build API items. `fallbackVerdict` covers Save plan, where unreviewed items
 * keep a placeholder verdict without pretending they were reviewed;
 * `keepFinals` (also Save plan) sends current finals for every kept item so
 * the planned card keeps its numbers.
 */
export function toPayloadItems(
  items: ReviewItem[],
  opts: { fallbackVerdict?: Verdict; keepFinals?: boolean } = {}
): PayloadItem[] {
  return items.map((item) => {
    const verdict = item.verdict ?? opts.fallbackVerdict;
    if (!verdict) throw new Error(`Item "${item.name}" has no verdict`);
    const finals =
      verdict === "removed" || (!opts.keepFinals && verdict === "up")
        ? {
            final_count: null,
            final_grams: null,
            final_kcal: null,
            final_protein_g: null,
            final_carbs_g: null,
            final_fat_g: null,
            final_fibre_g: null,
            final_sugar_g: null,
          }
        : {
            final_count: item.final.count,
            final_grams: item.final.grams,
            final_kcal: item.final.kcal,
            final_protein_g: item.final.protein,
            final_carbs_g: item.final.carbs,
            final_fat_g: item.final.fat,
            final_fibre_g: item.final.fibre,
            final_sugar_g: item.final.sugar,
          };
    return {
      ...(item.dbId !== undefined ? { id: item.dbId } : {}),
      name: item.name,
      unit: item.unit,
      ai_portion_desc: item.ai.portionDesc,
      ai_count: item.ai.count,
      ai_grams: item.ai.grams,
      ai_kcal: item.ai.kcal,
      ai_protein_g: item.ai.protein,
      ai_carbs_g: item.ai.carbs,
      ai_fat_g: item.ai.fat,
      ai_fibre_g: item.ai.fibre,
      ai_sugar_g: item.ai.sugar,
      ai_confidence: item.ai.confidence,
      verdict,
      ...finals,
    };
  });
}
