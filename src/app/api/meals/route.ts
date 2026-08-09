import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { mealItems, meals } from "@/db/schema";
import { ApiError, CreateMeal, resolveFinals } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = CreateMeal.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: body.error.issues[0]?.message ?? "Invalid meal." },
      { status: 400 }
    );
  }
  try {
    const resolved = body.data.items.map(resolveFinals);
    const meal = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(meals)
        .values({
          date: body.data.date,
          slot: body.data.slot,
          name: body.data.name,
          source: body.data.source,
          status: body.data.status,
          photoUrl: body.data.photo_url ?? null,
          notes: body.data.notes ?? null,
        })
        .returning();
      await tx.insert(mealItems).values(
        resolved.map((i) => ({
          mealId: created.id,
          name: i.name,
          aiPortionDesc: i.ai_portion_desc ?? null,
          aiGrams: i.ai_grams ?? null,
          aiKcal: i.ai_kcal ?? null,
          aiProteinG: i.ai_protein_g ?? null,
          aiCarbsG: i.ai_carbs_g ?? null,
          aiFatG: i.ai_fat_g ?? null,
          aiFibreG: i.ai_fibre_g ?? null,
          aiConfidence: i.ai_confidence ?? null,
          verdict: i.verdict,
          finalGrams: i.final_grams ?? null,
          finalKcal: i.final_kcal ?? null,
          finalProteinG: i.final_protein_g ?? null,
          finalCarbsG: i.final_carbs_g ?? null,
          finalFatG: i.final_fat_g ?? null,
          finalFibreG: i.final_fibre_g ?? null,
        }))
      );
      return created;
    });
    return NextResponse.json({ ok: true, data: { id: meal.id } });
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
    }
    console.error("[meals:create]", err);
    return NextResponse.json(
      { ok: false, error: "Could not save the meal. Please try again." },
      { status: 500 }
    );
  }
}
