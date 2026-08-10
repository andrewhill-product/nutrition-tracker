import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

/**
 * Analyse runs on Sonnet 5: Haiku kept misreading meals, and on a handful of
 * calls a day the accuracy is worth the cost. Distil runs on Opus 5: it fires
 * rarely, and distilling real patterns from 50 corrections is judgment work
 * where a bad rule would skew every future estimate.
 */
export const ANALYSE_MODEL = "claude-sonnet-5";
export const DISTIL_MODEL = "claude-opus-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: getEnv().ANTHROPIC_API_KEY });
  return client;
}

export type ClaudeJsonResult =
  | { kind: "ok"; text: string }
  | { kind: "refusal" }
  | { kind: "truncated" };

type ContentBlock = { type: string; text?: string };

/**
 * One structured-output call. Never passes `thinking` (always on for this
 * model; an explicit disable is a 400) and never temperature/top_p. Always
 * branches on stop_reason: "refusal" arrives as HTTP 200, "max_tokens" means
 * a truncated answer. The params cast covers `fallbacks`/`output_config`,
 * which the SDK types may lag behind.
 */
export async function callClaudeJson(opts: {
  model: string;
  system: string;
  messages: unknown[];
  schema: object;
  effort?: "low" | "medium" | "high";
}): Promise<ClaudeJsonResult> {
  // Both are Claude 5 models: thinking is adaptive and always on (never pass
  // the thinking param), and non-default temperature/top_p are 400s. Effort
  // is optional; Sonnet defaults to high, so analyse passes medium to keep
  // latency inside the mobile 55s cap. Only Opus takes the refusal-fallback
  // beta: it has the safety classifier that can refuse, Sonnet does not.
  const params = {
    model: opts.model,
    max_tokens: 16000,
    ...(opts.model === DISTIL_MODEL
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }
      : {}),
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: opts.messages,
  };
  const res = (await getClient().beta.messages.create(
    params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
  )) as unknown as { stop_reason: string | null; content: ContentBlock[] };

  if (res.stop_reason === "refusal") return { kind: "refusal" };
  if (res.stop_reason === "max_tokens") return { kind: "truncated" };
  const text = res.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");
  return { kind: "ok", text };
}

/** Strip stray markdown fences around a JSON payload. */
export function stripFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}
