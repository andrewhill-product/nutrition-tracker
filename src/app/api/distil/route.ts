import { NextResponse } from "next/server";
import { runDistil } from "@/lib/ai/distil";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  const outcome = await runDistil();
  return NextResponse.json(outcome.body, { status: outcome.status });
}
