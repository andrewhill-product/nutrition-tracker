import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { dailyActivity, workouts } from "@/db/schema";
import { ActivitySave } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * Manual activity entry from the Today view. Authoritative for what it
 * covers: steps are set (null clears them) and the day's exercises are
 * replaced. Other columns on the row are left untouched.
 */
export async function PUT(req: NextRequest) {
  const body = ActivitySave.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Steps and calories must be whole numbers." },
      { status: 400 }
    );
  }
  const d = body.data;
  await db.transaction(async (tx) => {
    await tx
      .insert(dailyActivity)
      .values({ date: d.date, steps: d.steps, receivedAt: new Date() })
      .onConflictDoUpdate({
        target: dailyActivity.date,
        set: { steps: d.steps, receivedAt: new Date() },
      });
    await tx.delete(workouts).where(eq(workouts.date, d.date));
    if (d.workouts.length > 0) {
      await tx.insert(workouts).values(
        d.workouts.map((w) => ({
          date: d.date,
          activityType: w.activity_type,
          durationMin: w.duration_min,
          activeKcal: w.kcal,
        }))
      );
    }
  });
  return NextResponse.json({ ok: true, data: null });
}
