import { z } from "zod";
import { isDateString } from "./dates";

export const DateString = z
  .string()
  .refine(isDateString, { message: "Expected a YYYY-MM-DD date" });

export const SlotEnum = z.enum(["breakfast", "lunch", "dinner", "snack"]);
export const SourceEnum = z.enum(["photo", "spreadsheet", "manual"]);
export const StatusEnum = z.enum(["logged", "planned"]);
export const VerdictEnum = z.enum(["up", "edited", "removed"]);

export type Slot = z.infer<typeof SlotEnum>;
export type Source = z.infer<typeof SourceEnum>;
export type Status = z.infer<typeof StatusEnum>;
export type Verdict = z.infer<typeof VerdictEnum>;

export const AnalysisItem = z.object({
  name: z.string().min(1),
  portion_desc: z.string(),
  grams: z.number().int().min(0),
  kcal: z.number().int().min(0),
  protein_g: z.number().min(0),
  carbs_g: z.number().min(0),
  fat_g: z.number().min(0),
  fibre_g: z.number().min(0),
  sugar_g: z.number().min(0),
  confidence: z.number().min(0).max(1),
});
export type AnalysisItemT = z.infer<typeof AnalysisItem>;

export const AnalysisResult = z.object({
  meal_name: z.string(),
  items: z.array(AnalysisItem),
  notes: z.string(),
});
export type AnalysisResultT = z.infer<typeof AnalysisResult>;

export const AnalyseRequest = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("image"), imageUrl: z.url() }),
  z.object({ mode: z.literal("text"), description: z.string().min(1).max(2000) }),
]);
export type AnalyseRequestT = z.infer<typeof AnalyseRequest>;

export const MealItemInput = z.object({
  id: z.number().int().positive().optional(),
  name: z.string().min(1),
  ai_portion_desc: z.string().nullish().default(null),
  ai_grams: z.number().int().min(0).nullish().default(null),
  ai_kcal: z.number().int().min(0).nullish().default(null),
  ai_protein_g: z.number().min(0).nullish().default(null),
  ai_carbs_g: z.number().min(0).nullish().default(null),
  ai_fat_g: z.number().min(0).nullish().default(null),
  ai_fibre_g: z.number().min(0).nullish().default(null),
  ai_sugar_g: z.number().min(0).nullish().default(null),
  ai_confidence: z.number().min(0).max(1).nullish().default(null),
  verdict: VerdictEnum,
  final_grams: z.number().int().min(0).nullish().default(null),
  final_kcal: z.number().int().min(0).nullish().default(null),
  final_protein_g: z.number().min(0).nullish().default(null),
  final_carbs_g: z.number().min(0).nullish().default(null),
  final_fat_g: z.number().min(0).nullish().default(null),
  final_fibre_g: z.number().min(0).nullish().default(null),
  final_sugar_g: z.number().min(0).nullish().default(null),
});
export type MealItemInputT = z.infer<typeof MealItemInput>;

function requireOneKeptItem(
  items: MealItemInputT[],
  ctx: z.RefinementCtx
) {
  if (!items.some((i) => i.verdict !== "removed")) {
    ctx.addIssue({
      code: "custom",
      message: "A meal needs at least 1 item that is not removed",
      path: ["items"],
    });
  }
}

export const CreateMeal = z
  .object({
    date: DateString,
    slot: SlotEnum,
    name: z.string().min(1).max(200),
    source: SourceEnum,
    status: StatusEnum.default("logged"),
    photo_url: z.url().nullish().default(null),
    notes: z.string().max(2000).nullish().default(null),
    items: z.array(MealItemInput).min(1),
  })
  .superRefine((meal, ctx) => requireOneKeptItem(meal.items, ctx));
export type CreateMealT = z.infer<typeof CreateMeal>;

export const UpdateMeal = z
  .object({
    date: DateString,
    slot: SlotEnum,
    name: z.string().min(1).max(200),
    // Optional: only the fresh-photo re-analyse path changes provenance.
    source: SourceEnum.optional(),
    // Required, no default: a partial payload must never silently convert planned to logged.
    status: StatusEnum,
    photo_url: z.url().nullish(),
    notes: z.string().max(2000).nullish(),
    items: z.array(MealItemInput).min(1),
  })
  .superRefine((meal, ctx) => requireOneKeptItem(meal.items, ctx));
export type UpdateMealT = z.infer<typeof UpdateMeal>;

export const TargetsInput = z.object({
  kcal: z.number().int().min(1).max(20000),
  protein_g: z.number().int().min(0).max(1000),
  carbs_g: z.number().int().min(0).max(2000),
  fat_g: z.number().int().min(0).max(1000),
  fibre_g: z.number().int().min(0).max(200),
  sugar_g: z.number().int().min(0).max(500),
});
export type TargetsInputT = z.infer<typeof TargetsInput>;

export const ImportRow = z.object({
  date: DateString,
  name: z.string().min(1).max(200),
  grams: z.number().int().min(0).nullish().default(null),
  portion_desc: z.string().nullish().default(null),
  kcal: z.number().int().min(0).nullish().default(null),
  protein_g: z.number().min(0).nullish().default(null),
  carbs_g: z.number().min(0).nullish().default(null),
  fat_g: z.number().min(0).nullish().default(null),
  fibre_g: z.number().min(0).nullish().default(null),
  sugar_g: z.number().min(0).nullish().default(null),
  // Only set when the estimate step produced the numbers (AI provenance).
  ai_confidence: z.number().min(0).max(1).nullish().default(null),
});
export type ImportRowT = z.infer<typeof ImportRow>;

export const ImportCommit = z
  .object({ rows: z.array(ImportRow).min(1).max(100) })
  .superRefine(({ rows }, ctx) => {
    const seen = new Set<string>();
    for (const row of rows) {
      if (seen.has(row.date)) {
        ctx.addIssue({
          code: "custom",
          message: `More than 1 row for ${row.date}. Keep a single dinner per date.`,
          path: ["rows"],
        });
      }
      seen.add(row.date);
    }
  });
export type ImportCommitT = z.infer<typeof ImportCommit>;

export const LoginInput = z.object({ password: z.string().min(1) });

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/**
 * Server-side verdict invariants. Client finals are never trusted for "up" or
 * "removed"; "edited" requires grams and kcal.
 */
export function resolveFinals(item: MealItemInputT): MealItemInputT {
  switch (item.verdict) {
    case "up":
      if (item.ai_kcal === null || item.ai_kcal === undefined) {
        throw new ApiError(
          400,
          `"${item.name}" has no AI estimate to accept. Edit it and enter values instead.`
        );
      }
      return {
        ...item,
        final_grams: item.ai_grams ?? null,
        final_kcal: item.ai_kcal,
        final_protein_g: item.ai_protein_g ?? null,
        final_carbs_g: item.ai_carbs_g ?? null,
        final_fat_g: item.ai_fat_g ?? null,
        final_fibre_g: item.ai_fibre_g ?? null,
        final_sugar_g: item.ai_sugar_g ?? null,
      };
    case "edited":
      if (
        item.final_grams === null ||
        item.final_grams === undefined ||
        item.final_kcal === null ||
        item.final_kcal === undefined
      ) {
        throw new ApiError(
          400,
          `"${item.name}" needs grams and kcal before it can be saved.`
        );
      }
      return item;
    case "removed":
      return {
        ...item,
        final_grams: null,
        final_kcal: null,
        final_protein_g: null,
        final_carbs_g: null,
        final_fat_g: null,
        final_fibre_g: null,
        final_sugar_g: null,
      };
  }
}
