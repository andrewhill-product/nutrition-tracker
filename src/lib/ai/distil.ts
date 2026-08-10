import { z } from "zod";
import { db } from "@/db";
import { calibrationNotes, type CalibrationNote } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCorrectionsForDistil } from "@/lib/calibration";
import { callClaudeJson, DISTIL_MODEL, stripFences } from "./client";
import { DISTIL_JSON_SCHEMA } from "./jsonSchemas";
import { buildDistilUser, DISTIL_SYSTEM } from "./prompts";

const DistilResult = z.object({ rules: z.array(z.string().min(1)) });

export type DistilOutcome =
  | {
      status: 200;
      body: { ok: true; data: { notes: CalibrationNote[]; message: string } };
    }
  | { status: 400 | 502; body: { ok: false; error: string } };

const FRIENDLY_FAILURE =
  "Sorry, updating the calibration did not work. Please try again.";

export async function runDistil(): Promise<DistilOutcome> {
  const corrections = await getCorrectionsForDistil();
  if (corrections.length === 0) {
    return {
      status: 400,
      body: { ok: false, error: "No corrections yet. Review a few meals first." },
    };
  }

  const messages = [
    { role: "user", content: [{ type: "text", text: buildDistilUser(corrections) }] },
  ];

  let rules: string[] | null = null;
  for (let attempt = 0; attempt < 2 && rules === null; attempt++) {
    let result;
    try {
      result = await callClaudeJson({
        model: DISTIL_MODEL,
        system: DISTIL_SYSTEM,
        messages,
        schema: DISTIL_JSON_SCHEMA,
        effort: "medium",
      });
    } catch (err) {
      console.error("[distil] API error", err);
      return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
    }
    if (result.kind === "refusal" || result.kind === "truncated") {
      return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
    }
    try {
      const parsed = DistilResult.safeParse(JSON.parse(stripFences(result.text)));
      if (parsed.success) rules = parsed.data.rules.slice(0, 10);
      else console.error("[distil] invalid shape", parsed.error.issues);
    } catch (err) {
      console.error("[distil] invalid JSON", err);
    }
  }
  if (rules === null) {
    return { status: 502, body: { ok: false, error: FRIENDLY_FAILURE } };
  }

  if (rules.length === 0) {
    const kept = await db
      .select()
      .from(calibrationNotes)
      .where(eq(calibrationNotes.active, true));
    return {
      status: 200,
      body: {
        ok: true,
        data: {
          notes: kept,
          message:
            "No clear patterns found in your recent corrections. Existing rules kept.",
        },
      },
    };
  }

  const inserted = await db.transaction(async (tx) => {
    await tx
      .update(calibrationNotes)
      .set({ active: false })
      .where(eq(calibrationNotes.active, true));
    return tx
      .insert(calibrationNotes)
      .values(rules!.map((note) => ({ note, active: true })))
      .returning();
  });

  return {
    status: 200,
    body: {
      ok: true,
      data: {
        notes: inserted,
        message: `Calibration updated with ${inserted.length} ${inserted.length === 1 ? "rule" : "rules"}.`,
      },
    },
  };
}
