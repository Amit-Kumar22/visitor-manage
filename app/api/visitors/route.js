import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Visitor from "@/models/Visitor";
import { getAuthFromRequest } from "@/lib/auth";
import { VISITOR_PURPOSES } from "@/lib/constants";
import { savePhoto } from "@/lib/savePhoto";

const PHONE_REGEX = /^\d{10}$/;
// Safety cap on the "export all" path so an unbounded dataset can't be pulled
// into memory in one request.
const EXPORT_MAX_ROWS = 5000;

// Public: called from the kiosk visitor form at "/". No auth required.
// Body is multipart/form-data (not JSON) so the captured camera photo can be
// sent as a real file rather than a base64 string.
export async function POST(request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const phone = formData.get("phone")?.toString().trim();
    const address = formData.get("address")?.toString().trim();
    const purpose = formData.get("purpose")?.toString();
    const meetingWith = formData.get("meetingWith")?.toString().trim();
    const photoFile = formData.get("photo");

    if (!name || !phone || !address || !purpose || !meetingWith) {
      return NextResponse.json(
        { error: "Name, phone, address, purpose, and meeting with are all required." },
        { status: 400 }
      );
    }

    if (!PHONE_REGEX.test(phone)) {
      return NextResponse.json(
        { error: "Phone number must be exactly 10 digits." },
        { status: 400 }
      );
    }

    if (!VISITOR_PURPOSES.includes(purpose)) {
      return NextResponse.json({ error: "Invalid purpose of visit." }, { status: 400 });
    }

    let photoUrl = null;
    if (photoFile instanceof File && photoFile.size > 0) {
      photoUrl = await savePhoto(photoFile);
    }

    await dbConnect();

    const visitor = await Visitor.create({
      name,
      phone,
      address,
      purpose,
      meetingWith,
      photo: photoUrl,
      entryTime: new Date(),
    });

    return NextResponse.json({ visitor }, { status: 201 });
  } catch (error) {
    console.error("POST /api/visitors error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Protected: admin dashboard only. Supports search, purpose/date filters, and pagination.
export async function GET(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
    const purpose = searchParams.get("purpose")?.trim();
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    // "all" bypasses pagination for the dashboard's export-to-Excel/PDF flow,
    // which needs every filtered row, not just the current page.
    const limitParam = searchParams.get("limit") || "10";
    const isExportAll = limitParam === "all";
    const limit = isExportAll ? 0 : Math.min(100, Math.max(1, parseInt(limitParam, 10) || 10));

    const query = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { name: { $regex: escaped, $options: "i" } },
        { phone: { $regex: escaped, $options: "i" } },
      ];
    }

    if (purpose && VISITOR_PURPOSES.includes(purpose)) {
      query.purpose = purpose;
    }

    if (dateFrom || dateTo) {
      query.entryTime = {};
      if (dateFrom) query.entryTime.$gte = new Date(`${dateFrom}T00:00:00.000`);
      if (dateTo) query.entryTime.$lte = new Date(`${dateTo}T23:59:59.999`);
    }

    const total = await Visitor.countDocuments(query);
    const findQuery = Visitor.find(query).sort({ entryTime: -1 });
    const visitors = isExportAll
      ? await findQuery.limit(EXPORT_MAX_ROWS)
      : await findQuery.skip((page - 1) * limit).limit(limit);

    return NextResponse.json({
      visitors,
      pagination: isExportAll
        ? { total, page: 1, limit: visitors.length, totalPages: 1 }
        : {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
    });
  } catch (error) {
    console.error("GET /api/visitors error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
