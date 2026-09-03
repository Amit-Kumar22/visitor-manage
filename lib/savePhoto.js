import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const EXT_BY_MIME = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

// Writes an uploaded photo (from multipart/form-data) to /public/uploads and
// returns the browser-servable URL to store on the Visitor document.
// Note: this assumes a writable, persistent local filesystem — fine for a
// self-hosted kiosk server, but won't survive on ephemeral/serverless hosts
// (e.g. Vercel), which would need a cloud bucket instead.
export async function savePhoto(file) {
  await mkdir(UPLOAD_DIR, { recursive: true });

  const ext = EXT_BY_MIME[file.type] || "jpg";
  const filename = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(UPLOAD_DIR, filename), buffer);

  return `/uploads/${filename}`;
}

// Removes a previously saved photo from disk, given the URL stored on the
// Visitor document (e.g. "/uploads/169...-uuid.jpg"). Called when a visitor
// record is deleted, so files don't accumulate forever with no owner.
// path.basename() strips any directory components, so this can only ever
// touch a file directly inside UPLOAD_DIR — never traverse elsewhere.
export async function deletePhoto(photoUrl) {
  if (!photoUrl) return;

  const filePath = path.join(UPLOAD_DIR, path.basename(photoUrl));

  try {
    await unlink(filePath);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Failed to delete photo file:", filePath, err);
    }
  }
}
