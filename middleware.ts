import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth/login"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // Allow static files and Next internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api/auth/logout")
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get("auth_token")?.value;
  const session = token ? await verifyToken(token) : null;

  // Not authenticated — redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based routing: analysts and admins go to /analyst
  if (pathname.startsWith("/dashboard") && (session.role === "analyst" || session.role === "admin")) {
    return NextResponse.redirect(new URL("/analyst", req.url));
  }

  // Regular users can't access /analyst
  if (pathname.startsWith("/analyst") && session.role === "user") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
