import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Visitor from "@/models/Visitor";
import { getAuthFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { VISITOR_PURPOSES } from "@/lib/constants";
import { deletePhoto } from "@/lib/savePhoto";

const PHONE_REGEX = /^\d{10}$/;
const EDITABLE_FIELDS = ["name", "phone", "address", "purpose", "meetingWith"];

// Protected: admin dashboard detail view.
export async function GET(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid visitor id." }, { status: 400 });
    }

    await dbConnect();
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
    }

    return NextResponse.json({ visitor });
  } catch (error) {
    console.error("GET /api/visitors/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Protected: marks a visitor's exit time as "now". Used by the "Mark Exit"
// button. Any authenticated staff (guard or admin) can do this — it's the
// one write action guards are allowed.
export async function PATCH(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid visitor id." }, { status: 400 });
    }

    await dbConnect();
    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
    }

    if (visitor.exitTime) {
      return NextResponse.json({ error: "Exit time is already recorded for this visitor." }, { status: 400 });
    }

    visitor.exitTime = new Date();
    await visitor.save();

    return NextResponse.json({ visitor });
  } catch (error) {
    console.error("PATCH /api/visitors/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Admin-only: full edit of a visitor's check-in details (correcting a typo'd
// phone number, wrong purpose, etc). Guards cannot call this.
export async function PUT(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid visitor id." }, { status: 400 });
    }

    const body = await request.json();

    if (body.phone !== undefined && !PHONE_REGEX.test(String(body.phone).trim())) {
      return NextResponse.json({ error: "Phone number must be exactly 10 digits." }, { status: 400 });
    }
    if (body.purpose !== undefined && !VISITOR_PURPOSES.includes(body.purpose)) {
      return NextResponse.json({ error: "Invalid purpose of visit." }, { status: 400 });
    }

    await dbConnect();

    const visitor = await Visitor.findById(id);
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
    }

    for (const field of EDITABLE_FIELDS) {
      if (body[field] !== undefined) {
        const value = String(body[field]).trim();
        if (!value) {
          return NextResponse.json({ error: `${field} cannot be empty.` }, { status: 400 });
        }
        visitor[field] = value;
      }
    }

    await visitor.save();
    return NextResponse.json({ visitor });
  } catch (error) {
    console.error("PUT /api/visitors/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

// Admin-only: permanently removes a visitor record. Guards cannot call this.
export async function DELETE(request, { params }) {
  const auth = getAuthFromRequest(request);
  if (!isAdmin(auth)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ error: "Invalid visitor id." }, { status: 400 });
    }

    await dbConnect();

    const visitor = await Visitor.findByIdAndDelete(id);
    if (!visitor) {
      return NextResponse.json({ error: "Visitor not found." }, { status: 404 });
    }

    await deletePhoto(visitor.photo);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/visitors/[id] error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
