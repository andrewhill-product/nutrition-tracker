import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { targets } from "@/db/schema";
import { TargetsInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const body = TargetsInput.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Targets must be whole numbers." },
      { status: 400 }
    );
  }
  const values = {
    id: 1,
    kcal: body.data.kcal,
    proteinG: body.data.protein_g,
    carbsG: body.data.carbs_g,
    fatG: body.data.fat_g,
    fibreG: body.data.fibre_g,
  };
  await db
    .insert(targets)
    .values(values)
    .onConflictDoUpdate({ target: targets.id, set: values });
  return NextResponse.json({ ok: true, data: null });
}
