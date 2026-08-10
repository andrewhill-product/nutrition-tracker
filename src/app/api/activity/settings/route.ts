import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { targets } from "@/db/schema";

export const dynamic = "force-dynamic";

const Input = z.object({ show_weight: z.boolean() });

export async function PUT(req: NextRequest) {
  const body = Input.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Expected { show_weight: boolean }." },
      { status: 400 }
    );
  }
  const updated = await db
    .update(targets)
    .set({ showWeight: body.data.show_weight })
    .where(eq(targets.id, 1))
    .returning({ id: targets.id });
  if (updated.length === 0) {
    // No targets row yet: seed defaults so the toggle sticks.
    await db.insert(targets).values({
      id: 1,
      kcal: 2250,
      proteinG: 140,
      carbsG: 230,
      fatG: 75,
      fibreG: 30,
      sugarG: 90,
      showWeight: body.data.show_weight,
    });
  }
  return NextResponse.json({ ok: true, data: null });
}
