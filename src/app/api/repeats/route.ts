import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { repeatItems, repeats } from "@/db/schema";
import { RepeatInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = RepeatInput.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "A repeat needs a name and at least 1 item with calories." },
      { status: 400 }
    );
  }
  const created = await db.transaction(async (tx) => {
    const [repeat] = await tx
      .insert(repeats)
      .values({ name: body.data.name, slot: body.data.slot })
      .returning();
    await tx.insert(repeatItems).values(
      body.data.items.map((i) => ({
        repeatId: repeat.id,
        name: i.name,
        grams: i.grams ?? null,
        kcal: i.kcal,
        proteinG: i.protein_g ?? null,
        carbsG: i.carbs_g ?? null,
        fatG: i.fat_g ?? null,
        fibreG: i.fibre_g ?? null,
        sugarG: i.sugar_g ?? null,
      }))
    );
    return repeat;
  });
  return NextResponse.json({ ok: true, data: { id: created.id } });
}
