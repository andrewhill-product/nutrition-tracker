import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { repeats } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return NextResponse.json({ ok: false, error: "Bad repeat id." }, { status: 400 });
  }
  const deleted = await db
    .delete(repeats)
    .where(eq(repeats.id, parsed))
    .returning({ id: repeats.id });
  if (deleted.length === 0) {
    return NextResponse.json({ ok: false, error: "Repeat not found." }, { status: 404 });
  }
  return NextResponse.json({ ok: true, data: null });
}
