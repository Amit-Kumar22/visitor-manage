import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ensureAdminSeed } from "@/lib/seedAdmin";
import { signToken, AUTH_COOKIE } from "@/lib/auth";

export async function POST(request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    await dbConnect();
    await ensureAdminSeed();

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    // Always run bcrypt.compare, even with no matching user, against a dummy
    // hash — so response time doesn't leak whether the email exists.
    const passwordMatches = await bcrypt.compare(
      password,
      user?.password || "$2b$10$TrNPpvxtU0BWAOFpGm0g7eXAqKasoyw01VlUe3hJe/Kkv0Wkdf7ya"
    );

    if (!user || !passwordMatches) {
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    const token = signToken({
      userId: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
    });
    // "secure" cookies are only ever sent back by the browser over HTTPS.
    // If you're deploying without a domain (no Let's Encrypt cert possible)
    // and serving over plain HTTP, set COOKIE_SECURE=false in .env.local or
    // login will silently appear broken — the cookie gets set but the
    // browser never sends it back. Leave this unset once you do have HTTPS.
    const insecureCookieOverride = process.env.COOKIE_SECURE === "false";
    response.cookies.set(AUTH_COOKIE, token, {
      httpOnly: true,
      secure: !insecureCookieOverride && process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 hours, matches the JWT's own expiry
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("POST /api/auth/login error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
