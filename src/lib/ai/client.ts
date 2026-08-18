import Anthropic from "@anthropic-ai/sdk";
import { getEnv } from "@/lib/env";

/**
 * Everything runs on Sonnet 5. Analyse moved off Haiku 4.5 (it kept
 * misreading meals). Distil moved off Opus 5 after it dominated the bill:
 * each press of Update calibration billed dollars of thinking tokens and
 * could outlast the phone's 55s fetch window, so presses that looked failed
 * were retried and billed again. Sonnet is far cheaper and finishes in time.
 */
export const ANALYSE_MODEL = "claude-sonnet-5";
export const DISTIL_MODEL = "claude-sonnet-5";

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
  // Sonnet 5: thinking is adaptive and always on (never pass the thinking
  // param), and non-default temperature/top_p are 400s. Effort is optional
  // and defaults to high; callers pass medium to balance quality against
  // latency and thinking spend. The server-side fallback beta was Opus-only
  // and left with it.
  const params = {
    model: opts.model,
    max_tokens: 16000,
    output_config: {
      effort: opts.effort ?? "medium",
      format: { type: "json_schema", schema: opts.schema },
    },
    system: opts.system,
    messages: opts.messages,
  };
  const res = (await getClient().beta.messages.create(
    params as unknown as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming
  )) as unknown as {
    stop_reason: string | null;
    content: ContentBlock[];
    usage?: { input_tokens?: number; output_tokens?: number };
  };
  // Per-call token line in the Vercel function logs, so any future billing
  // surprise is diagnosable without the platform console.
  console.log(
    `[claude] ${opts.model} in=${res.usage?.input_tokens ?? "?"} out=${res.usage?.output_tokens ?? "?"} stop=${res.stop_reason}`
  );

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
