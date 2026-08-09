import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { mealItems, meals } from "@/db/schema";
import { ImportCommit } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = ImportCommit.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: body.error.issues[0]?.message ?? "Invalid import." },
      { status: 400 }
    );
  }
  try {
    await db.transaction(async (tx) => {
      for (const row of body.data.rows) {
        // Re-importing replaces only planned dinners on that date; logged
        // meals are never touched.
        await tx
          .delete(meals)
          .where(
            and(
              eq(meals.date, row.date),
              eq(meals.slot, "dinner"),
              eq(meals.status, "planned")
            )
          );
        const [created] = await tx
          .insert(meals)
          .values({
            date: row.date,
            slot: "dinner",
            name: row.name,
            source: "spreadsheet",
            status: "planned",
          })
          .returning();
        // Placeholder verdict "up": conversion mode resets verdicts client-side
        // so this is never treated as a real review. ai_confidence stays NULL
        // unless the estimate step produced the numbers.
        await tx.insert(mealItems).values({
          mealId: created.id,
          name: row.name,
          aiPortionDesc: row.portion_desc ?? null,
          aiGrams: row.grams ?? null,
          aiKcal: row.kcal ?? null,
          aiProteinG: row.protein_g ?? null,
          aiCarbsG: row.carbs_g ?? null,
          aiFatG: row.fat_g ?? null,
          aiFibreG: row.fibre_g ?? null,
          aiConfidence: row.ai_confidence ?? null,
          verdict: "up",
          finalGrams: row.grams ?? null,
          finalKcal: row.kcal ?? null,
          finalProteinG: row.protein_g ?? null,
          finalCarbsG: row.carbs_g ?? null,
          finalFatG: row.fat_g ?? null,
          finalFibreG: row.fibre_g ?? null,
        });
      }
    });
    return NextResponse.json({ ok: true, data: { imported: body.data.rows.length } });
  } catch (err) {
    console.error("[import:commit]", err);
    return NextResponse.json(
      { ok: false, error: "Could not import the plan. Please try again." },
      { status: 500 }
    );
  }
}
