import { NextResponse, type NextRequest } from "next/server";
import { DEFAULT_LOCALE, LOCALES, isLocale, detectLocaleFromAcceptLanguage } from "./lib/i18n/config";

const PUBLIC_FILE = /\.(.*)$/;

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // Already has locale
  if (first && isLocale(first)) {
    const res = NextResponse.next();
    res.cookies.set("X-NEXT-LOCALE", first, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
    return res;
  }

  // Root: redirect to locale based on cookie -> accept-language -> default
  const preferred = req.cookies.get("X-NEXT-LOCALE")?.value;
  const locale =
    (preferred && isLocale(preferred)) ||
    detectLocaleFromAcceptLanguage(req.headers.get("accept-language")) ||
    DEFAULT_LOCALE;

  const rest = pathname === "/" ? "" : pathname;
  const target = req.nextUrl.clone();
  target.pathname = `/${locale}${rest}`;
  return NextResponse.redirect(target, 302);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"]
};
