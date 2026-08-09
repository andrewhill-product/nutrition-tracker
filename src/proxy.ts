import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, deriveToken, safeEqual } from "@/lib/auth";

export default async function proxy(req: NextRequest) {
  const password = process.env.APP_PASSWORD;
  const cookie = req.cookies.get(AUTH_COOKIE)?.value;

  if (password && cookie && (await safeEqual(cookie, await deriveToken(password)))) {
    return NextResponse.next();
  }

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = "";
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!login|api/login|_next/static|_next/image|favicon\\.ico|icon\\.svg|icons/|manifest\\.webmanifest|sw\\.js|offline).*)",
  ],
};
