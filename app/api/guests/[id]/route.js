import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Guest from "@/models/Guest";
import { getAuthFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { deletePhoto } from "@/lib/savePhoto";

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const REQUIRED_EDITABLE_FIELDS = ["name", "mobile"];
const OPTIONAL_EDITABLE_FIELDS = ["email", "company", "designation", "city"];

// Protected: admin/guard dashboard detail view.
export async function GET(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid guest id." }, { status: 400 });
    }

    await dbConnect();
    const guest = await Guest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    return NextResponse.json({ guest });
  } catch (error) {
    console.error("GET /api/guests/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Protected: marks a guest's check-in time as "now". Used by the "Mark
// Check-in" button. Any authenticated staff (guard or admin) can do this —
// it's the one write action guards are allowed.
export async function PATCH(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid guest id." }, { status: 400 });
    }

    await dbConnect();
    const guest = await Guest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    if (guest.checkInTime) {
      return NextResponse.json({ error: "Check-in time is already recorded for this guest." }, { status: 400 });
    }

    guest.checkInTime = new Date();
    await guest.save();

    return NextResponse.json({ guest });
  } catch (error) {
    console.error("PATCH /api/guests/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Admin-only: full edit of a guest's registration details (correcting a
// typo'd mobile number, company name, etc). Guards cannot call this.
export async function PUT(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid guest id." }, { status: 400 });
    }

    const body = await request.json();

    if (body.mobile !== undefined && !PHONE_REGEX.test(String(body.mobile).trim())) {
      return NextResponse.json({ error: "Mobile number must be exactly 10 digits." }, { status: 400 });
    }
    if (body.email !== undefined && body.email.trim() && !EMAIL_REGEX.test(body.email.trim())) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    await dbConnect();

    const guest = await Guest.findById(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    for (const field of REQUIRED_EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim();
        if (!value) {
          return NextResponse.json({ error: `${field} cannot be empty.` }, { status: 400 });
        }
        guest[field] = value;
      }
    }

    for (const field of OPTIONAL_EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        guest[field] = String(body[field]).trim();
      }
    }

    await guest.save();
    return NextResponse.json({ guest });
  } catch (error) {
    console.error("PUT /api/guests/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Admin-only: permanently removes a guest record. Guards cannot call this.
export async function DELETE(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid guest id." }, { status: 400 });
    }

    await dbConnect();

    const guest = await Guest.findByIdAndDelete(id);
    if (!guest) {
      return NextResponse.json({ error: "Guest not found." }, { status: 404 });
    }

    await deletePhoto(guest.photo);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/guests/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
