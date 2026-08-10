import {
  getMatchingCorrections,
  getRecentCorrections,
} from "@/lib/calibration";
import { getActiveNotes } from "@/lib/queries";
import {
  AnalysisResult,
  type AnalyseRequestT,
  type AnalysisResultT,
} from "@/lib/schemas";
import { ANALYSE_MODEL, callClaudeJson, stripFences } from "./client";
import { ANALYSIS_JSON_SCHEMA } from "./jsonSchemas";
import { buildAnalyseSystem } from "./prompts";

export type AnalyseOutcome =
  | { status: 200; body: { ok: true; data: AnalysisResultT } }
  | { status: 502; body: { ok: false; error: string } };

const FRIENDLY_FAILURE =
  "Sorry, the analysis did not work. Please try again, or add the meal manually.";
const REFUSAL_MESSAGE =
  "Claude could not analyse this photo. Try a clearer shot of just the food, or enter the meal by hand.";

export async function runAnalyse(req: AnalyseRequestT): Promise<AnalyseOutcome> {
  const [notes, corrections] = await Promise.all([
    getActiveNotes(),
    req.mode === "text"
      ? getMatchingCorrections(req.description)
      : getRecentCorrections(),
  ]);
  const system = buildAnalyseSystem(notes, corrections);
  const messages =
    req.mode === "image"
      ? [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "url", url: req.imageUrl } },
              ...(req.labelUrl
                ? [{ type: "image", source: { type: "url", url: req.labelUrl } }]
                : []),
              {
                type: "text",
                text: req.labelUrl
                  ? "The first photo is the meal; the second is the packaging nutrition label. Read the values from the label and scale them to the portion visible in the meal photo. Label-derived values deserve high confidence."
                  : "Estimate the food items and portions in this meal photo.",
              },
            ],
          },
        ]
      : [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Estimate the food items and portions in this meal: ${req.description}`,
              },
            ],
          },
        ];

  if (process.env.NODE_ENV === "development") {
    console.log("[analyse] system prompt:\n" + system);
  }

  // One model call per request; auto-retry once only on a cheap parse/zod
  // failure. Refusal or truncation returns immediately so the user's "Try
  // again" is the second model call.
  for (let attempt = 0; attempt < 2; attempt++) {
    let result;
    try {
      result = await callClaudeJson({
        model: ANALYSE_MODEL,
        system,
        messages,
        schema: ANALYSIS_JSON_SCHEMA,
      });
    } catch (err) {
      console.error("[analyse] API error", err);
      return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
    }
    if (result.kind === "refusal") {
      return { status: 502, body: { ok: false, error: REFUSAL_MESSAGE } };
    }
    if (result.kind === "truncated") {
      return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
    }
    try {
      const parsed = AnalysisResult.safeParse(JSON.parse(stripFences(result.text)));
      if (parsed.success) {
        return { status: 200, body: { ok: true, data: parsed.data } };
      }
      console.error("[analyse] invalid shape", parsed.error.issues);
    } catch (err) {
      console.error("[analyse] invalid JSON", err);
    }
  }
  return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
}
