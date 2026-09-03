import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthFromRequest } from "@/lib/auth";
import { isAdmin, ROLE_VALUES } from "@/lib/roles";

const SALT_ROUNDS = 10;

// Both routes below are admin-only: guards can view/act on visitors but have
// no access to account management at all.
export async function GET(request) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const users = await User.find({}, "-password").sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (error) {
    console.error("GET /api/users error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function POST(request) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { email, password, name, role } = await request.json();

    if (!email?.trim() || !password || !role) {
      return NextResponse.json({ error: "Email, password, and role are required." }, { status: 400 });
    }
    if (!ROLE_VALUES.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      email: normalizedEmail,
      password: passwordHash,
      name: name?.trim() || "",
      role,
    });

    const { password: _password, ...safeUser } = user.toObject();
    return NextResponse.json({ user: safeUser }, { status: 201 });
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
