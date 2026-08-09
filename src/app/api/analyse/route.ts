import { NextResponse, type NextRequest } from "next/server";
import { runAnalyse } from "@/lib/ai/analyse";
import { AnalyseRequest } from "@/lib/schemas";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = AnalyseRequest.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json(
      { ok: false, error: "Send a photo URL or a meal description." },
      { status: 400 }
    );
  }
  const outcome = await runAnalyse(body.data);
  return NextResponse.json(outcome.body, { status: outcome.status });
}
