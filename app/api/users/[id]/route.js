import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { getAuthFromRequest } from "@/lib/auth";
import { isAdmin, ROLE_VALUES, ROLES } from "@/lib/roles";

const SALT_ROUNDS = 10;

export async function PATCH(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    const { name, role, password } = await request.json();

    if (role && !ROLE_VALUES.includes(role)) {
      return NextResponse.json({ error: "Invalid role." }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    // Don't let the last admin demote themselves (or be demoted) into a
    // guard, which would lock everyone out of user management.
    if (role && role !== ROLES.ADMIN && user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot change the role of the last remaining admin." }, { status: 400 });
      }
    }

    if (name !== undefined) user.name = name.trim();
    if (role) user.role = role;
    if (password) user.password = await bcrypt.hash(password, SALT_ROUNDS);

    await user.save();

    const { password: _password, ...safeUser } = user.toObject();
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("PATCH /api/users/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid user id." }, { status: 400 });
    }

    if (id === auth.userId) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    if (user.role === ROLES.ADMIN) {
      const adminCount = await User.countDocuments({ role: ROLES.ADMIN });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "Cannot delete the last remaining admin." }, { status: 400 });
      }
    }

    await user.deleteOne();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/users/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
