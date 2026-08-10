import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { discardedAnalyses } from "@/db/schema";
import { DiscardInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = DiscardInput.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: body.error.issues[0]?.message ?? "Invalid discard." },
      { status: 400 }
    );
  }
  try {
    const [created] = await db
      .insert(discardedAnalyses)
      .values({
        source: body.data.source,
        aiMealName: body.data.ai_meal_name,
        aiItemsSummary: body.data.ai_items_summary,
        note: body.data.note?.trim() || null,
      })
      .returning();
    return NextResponse.json({ ok: true, data: { id: created.id } });
  } catch (err) {
    console.error("[discards:create]", err);
    return NextResponse.json(
      { ok: false, error: "Could not record the discard." },
      { status: 500 }
    );
  }
}
