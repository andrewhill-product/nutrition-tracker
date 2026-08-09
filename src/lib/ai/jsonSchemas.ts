/**
 * JSON schemas for structured output. No numeric bounds (unsupported by the
 * structured-output implementation); zod enforces ranges after parsing.
 */
export const ANALYSIS_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["meal_name", "items", "notes"],
  properties: {
    meal_name: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "portion_desc",
          "grams",
          "kcal",
          "protein_g",
          "carbs_g",
          "fat_g",
          "fibre_g",
          "confidence",
        ],
        properties: {
          name: { type: "string" },
          portion_desc: { type: "string" },
          grams: { type: "integer" },
          kcal: { type: "integer" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          fibre_g: { type: "number" },
          confidence: { type: "number" },
        },
      },
    },
    notes: { type: "string" },
  },
} as const;

export const DISTIL_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["rules"],
  properties: {
    rules: { type: "array", items: { type: "string" } },
  },
} as const;
