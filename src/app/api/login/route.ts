import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, AUTH_MAX_AGE, deriveToken, safeEqual } from "@/lib/auth";
import { getEnv } from "@/lib/env";
import { LoginInput } from "@/lib/schemas";

export const dynamic = "force-dynamic";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: NextRequest) {
  const body = LoginInput.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ ok: false, error: "Enter the password." }, { status: 400 });
  }
  const { APP_PASSWORD } = getEnv();
  if (!(await safeEqual(body.data.password, APP_PASSWORD))) {
    await sleep(750);
    return NextResponse.json(
      { ok: false, error: "That password is not right." },
      { status: 401 }
    );
  }
  const res = NextResponse.json({ ok: true, data: null });
  res.cookies.set(AUTH_COOKIE, await deriveToken(APP_PASSWORD), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: AUTH_MAX_AGE,
    path: "/",
  });
  return res;
}
