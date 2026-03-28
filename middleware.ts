import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "fintech-demo-secret-key-change-in-production"
);

const PUBLIC_PATHS = ["/login", "/api/auth/login", "/api/auth/logout"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths and Next internals
  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // Verify JWT directly (Edge Runtime compatible)
  const token = req.cookies.get("auth_token")?.value;
  let session: { sub: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, JWT_SECRET);
      session = payload as { sub: string; role: string };
    } catch {
      session = null;
    }
  }

  // Not authenticated — redirect to login
  if (!session) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based routing: analysts and admins go to /analyst
  if (
    pathname.startsWith("/dashboard") &&
    (session.role === "analyst" || session.role === "admin")
  ) {
    return NextResponse.redirect(new URL("/analyst", req.url));
  }

  // Regular users cannot access /analyst
  if (pathname.startsWith("/analyst") && session.role === "user") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
