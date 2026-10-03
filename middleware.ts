import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const openPaths = ["/login", "/register", "/forgot", "/reset-password"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/uploads") ||
    /\.(png|jpe?g|webp|gif|svg|ico)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(req.cookies.get("session")?.value);
  if (pathname === "/") {
    return NextResponse.redirect(new URL(hasSession ? "/profile" : "/login", req.url));
  }

  const isOpen = openPaths.includes(pathname);
  if (!hasSession && !isOpen) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && isOpen) {
    return NextResponse.redirect(new URL("/profile", req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
