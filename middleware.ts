import { NextResponse } from "next/server";
import { auth } from "@/auth";

const PUBLIC_PAGE_PATHS = ["/login", "/signup"];
const PUBLIC_API_PREFIXES = ["/api/auth", "/api/signup"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  const isPublicPage = PUBLIC_PAGE_PATHS.includes(pathname);
  const isPublicApi = PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isPublicPage || isPublicApi) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    if (!isLoggedIn) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|icons|manifest.webmanifest).*)"],
};