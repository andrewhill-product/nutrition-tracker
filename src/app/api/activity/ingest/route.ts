import { eq, sql } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { dailyActivity, workouts } from "@/db/schema";
import { safeEqual } from "@/lib/auth";
import { ActivityIngest } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * Apple Health daily push from the iPhone Shortcuts automation
 * (docs/APPLE-HEALTH.md). Exempt from cookie auth in src/proxy.ts because
 * Shortcuts cannot sign in; authenticated by "Authorization: Bearer
 * <APP_PASSWORD>" instead.
 *
 * Merge semantics: an incoming null never overwrites a stored value, so a
 * weight-only push cannot wipe the morning's steps. Re-running the shortcut
 * for a date is always safe.
 */
export async function POST(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!password || !token || !(await safeEqual(token, password))) {
    return NextResponse.json({ ok: false, error: "Not authorised." }, { status: 401 });
  }

  const body = ActivityIngest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    const detail = body.error.issues
      .map((i) => `${i.path.join(".") || "payload"}: ${i.message}`)
      .join("; ");
    return NextResponse.json(
      { ok: false, error: `Invalid activity payload. ${detail}` },
      { status: 400 }
    );
  }

  const d = body.data;
  const round = (v: number | null) => (v === null ? null : Math.round(v));
  const values = {
    date: d.date,
    steps: round(d.steps),
    activeKcal: round(d.active_kcal),
    restingKcal: round(d.resting_kcal),
    exerciseMinutes: round(d.exercise_minutes),
    restingHr: round(d.resting_hr),
    weightKg: d.weight_kg === null ? null : Math.round(d.weight_kg * 10) / 10,
    receivedAt: new Date(),
  };

  await db.transaction(async (tx) => {
    await tx
      .insert(dailyActivity)
      .values(values)
      .onConflictDoUpdate({
        target: dailyActivity.date,
        set: {
          steps: sql`coalesce(excluded.steps, ${dailyActivity.steps})`,
          activeKcal: sql`coalesce(excluded.active_kcal, ${dailyActivity.activeKcal})`,
          restingKcal: sql`coalesce(excluded.resting_kcal, ${dailyActivity.restingKcal})`,
          exerciseMinutes: sql`coalesce(excluded.exercise_minutes, ${dailyActivity.exerciseMinutes})`,
          restingHr: sql`coalesce(excluded.resting_hr, ${dailyActivity.restingHr})`,
          weightKg: sql`coalesce(excluded.weight_kg, ${dailyActivity.weightKg})`,
          receivedAt: values.receivedAt,
        },
      });
    if (d.workouts !== null) {
      await tx.delete(workouts).where(eq(workouts.date, d.date));
      if (d.workouts.length > 0) {
        await tx.insert(workouts).values(
          d.workouts.map((w) => ({
            date: d.date,
            activityType: w.activity_type,
            durationMin: Math.round(w.duration_min),
            activeKcal: round(w.active_kcal),
            startedAt: w.started_at,
          }))
        );
      }
    }
  });

  return NextResponse.json({
    ok: true,
    data: { date: d.date, workouts: d.workouts?.length ?? null },
  });
}
