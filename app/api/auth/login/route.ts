import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { sql } from "@/lib/db";
import { signToken, type UserRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: { code: "bad_request", message: "Email and password are required." } },
        { status: 400 }
      );
    }

    const rows = await sql`
      SELECT id, email, password_hash, role FROM users WHERE email = ${email} LIMIT 1
    `;

    const user = rows[0] as
      | { id: string; email: string; password_hash: string; role: string }
      | undefined;

    if (!user) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: { code: "unauthorized", message: "Invalid email or password." } },
        { status: 401 }
      );
    }

    const token = await signToken({
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
    });

    const response = NextResponse.json({
      token,
      user: { id: user.id, email: user.email, role: user.role },
    });

    response.cookies.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[auth/login]", err);
    return NextResponse.json(
      { error: { code: "internal_error", message: "Login failed." } },
      { status: 500 }
    );
  }
}
