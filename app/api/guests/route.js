import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Guest from "@/models/Guest";
import { getAuthFromRequest } from "@/lib/auth";
import { savePhoto } from "@/lib/savePhoto";
import { generateRegistrationId } from "@/lib/registrationId";

const PHONE_REGEX = /^\d{10}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Safety cap on the "export all" path so an unbounded dataset can't be pulled
// into memory in one request.
const EXPORT_MAX_ROWS = 5000;

// Public: called from the event guest registration kiosk at "/event". No
// auth required. Body is multipart/form-data (not JSON) so the captured
// camera photo can be sent as a real file rather than a base64 string.
export async function POST(request) {
  try {
    const formData = await request.formData();

    const name = formData.get("name")?.toString().trim();
    const mobile = formData.get("mobile")?.toString().trim();
    const email = formData.get("email")?.toString().trim() || "";
    const company = formData.get("company")?.toString().trim() || "";
    const designation = formData.get("designation")?.toString().trim() || "";
    const city = formData.get("city")?.toString().trim() || "";
    const photoFile = formData.get("photo");

    if (!name || !mobile) {
      return NextResponse.json({ error: "Name and mobile number are required." }, { status: 400 });
    }

    if (!PHONE_REGEX.test(mobile)) {
      return NextResponse.json({ error: "Mobile number must be exactly 10 digits." }, { status: 400 });
    }

    if (email && !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
    }

    if (!(photoFile instanceof File) || photoFile.size === 0) {
      return NextResponse.json({ error: "Profile photo is required." }, { status: 400 });
    }

    const photoUrl = await savePhoto(photoFile);

    await dbConnect();

    const guest = await Guest.create({
      name,
      mobile,
      email,
      company,
      designation,
      city,
      photo: photoUrl,
      registrationId: generateRegistrationId(),
      registrationTime: new Date(),
    });

    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    console.error("POST /api/guests error:", error);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// Protected: admin/guard dashboard only. Supports search, date filters, and pagination.
export async function GET(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim();
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
        { mobile: { $regex: escaped, $options: "i" } },
        { email: { $regex: escaped, $options: "i" } },
        { company: { $regex: escaped, $options: "i" } },
        { registrationId: { $regex: escaped, $options: "i" } },
      ];
    }

    if (dateFrom || dateTo) {
      query.registrationTime = {};
      if (dateFrom) query.registrationTime.$gte = new Date(`${dateFrom}T00:00:00.000`);
      if (dateTo) query.registrationTime.$lte = new Date(`${dateTo}T23:59:59.999`);
    }

    const total = await Guest.countDocuments(query);
    const findQuery = Guest.find(query).sort({ registrationTime: -1 });
    const guests = isExportAll
      ? await findQuery.limit(EXPORT_MAX_ROWS)
      : await findQuery.skip((page - 1) * limit).limit(limit);

    return NextResponse.json({
      guests,
      pagination: isExportAll
        ? { total, page: 1, limit: guests.length, totalPages: 1 }
        : {
            total,
            page,
            limit,
            totalPages: Math.max(1, Math.ceil(total / limit)),
          },
    });
  } catch (error) {
    console.error("GET /api/guests error:", error);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
