import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { mealItems, meals } from "@/db/schema";
import { ApiError, resolveFinals, UpdateMeal } from "@/lib/schemas";

export const dynamic = "force-dynamic";

async function parseId(params: Promise<{ id: string }>): Promise<number | null> {
  const { id } = await params;
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = await parseId(ctx.params);
  if (id === null) {
    return NextResponse.json({ ok: false, error: "Bad meal id." }, { status: 400 });
  }
  const body = UpdateMeal.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: body.error.issues[0]?.message ?? "Invalid meal." },
      { status: 400 }
    );
  }
  try {
    // The verdict gate protects logged data. Saving a still-planned meal keeps
    // placeholder verdicts and stored finals as sent; planned meals never
    // count in totals and conversion mode re-collects real verdicts.
    const resolved =
      body.data.status === "planned"
        ? body.data.items
        : body.data.items.map(resolveFinals);
    await db.transaction(async (tx) => {
      const existing = await tx.select().from(meals).where(eq(meals.id, id)).limit(1);
      if (existing.length === 0) throw new ApiError(404, "Meal not found.");

      // Replace-all items, but preserve calibration history the client did not
      // send: DB rows already marked "removed" that are absent from the
      // payload are re-inserted unchanged.
      const oldItems = await tx.select().from(mealItems).where(eq(mealItems.mealId, id));
      const sentIds = new Set(
        body.data.items.map((i) => i.id).filter((v): v is number => v !== undefined)
      );
      const preservedRemoved = oldItems.filter(
        (i) => i.verdict === "removed" && !sentIds.has(i.id)
      );

      await tx.delete(mealItems).where(eq(mealItems.mealId, id));
      await tx
        .update(meals)
        .set({
          date: body.data.date,
          slot: body.data.slot,
          name: body.data.name,
          status: body.data.status,
          ...(body.data.source ? { source: body.data.source } : {}),
          ...(body.data.photo_url !== undefined ? { photoUrl: body.data.photo_url } : {}),
          ...(body.data.notes !== undefined ? { notes: body.data.notes } : {}),
        })
        .where(eq(meals.id, id));
      await tx.insert(mealItems).values([
        ...resolved.map((i) => ({
          mealId: id,
          name: i.name,
          aiPortionDesc: i.ai_portion_desc ?? null,
          aiGrams: i.ai_grams ?? null,
          aiKcal: i.ai_kcal ?? null,
          aiProteinG: i.ai_protein_g ?? null,
          aiCarbsG: i.ai_carbs_g ?? null,
          aiFatG: i.ai_fat_g ?? null,
          aiFibreG: i.ai_fibre_g ?? null,
          aiSugarG: i.ai_sugar_g ?? null,
          aiConfidence: i.ai_confidence ?? null,
          verdict: i.verdict,
          finalGrams: i.final_grams ?? null,
          finalKcal: i.final_kcal ?? null,
          finalProteinG: i.final_protein_g ?? null,
          finalCarbsG: i.final_carbs_g ?? null,
          finalFatG: i.final_fat_g ?? null,
          finalFibreG: i.final_fibre_g ?? null,
          finalSugarG: i.final_sugar_g ?? null,
        })),
        ...preservedRemoved.map((row) => ({
          mealId: row.mealId,
          name: row.name,
          aiPortionDesc: row.aiPortionDesc,
          aiGrams: row.aiGrams,
          aiKcal: row.aiKcal,
          aiProteinG: row.aiProteinG,
          aiCarbsG: row.aiCarbsG,
          aiFatG: row.aiFatG,
          aiFibreG: row.aiFibreG,
          aiSugarG: row.aiSugarG,
          aiConfidence: row.aiConfidence,
          verdict: row.verdict,
          finalGrams: row.finalGrams,
          finalKcal: row.finalKcal,
          finalProteinG: row.finalProteinG,
          finalCarbsG: row.finalCarbsG,
          finalFatG: row.finalFatG,
          finalFibreG: row.finalFibreG,
          finalSugarG: row.finalSugarG,
        })),
      ]);
    });
    return NextResponse.json({ ok: true, data: { id } });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[meals:update]", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the meal. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const id = await parseId(ctx.params);
  if (id === null) {
    return NextResponse.json({ ok: false, error: "Bad meal id." }, { status: 400 });
  }
  const deleted = await db.delete(meals).where(eq(meals.id, id)).returning({ id: meals.id });
  if (deleted.length === 0) {
    return NextResponse.json({ ok: false, error: "Meal not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: { id } });
}
