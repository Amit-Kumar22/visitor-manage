import crypto from "crypto";

// Human-readable, sufficiently unique registration ID for event guests (e.g.
// "EVT-20260909-A1B2C3"). The date prefix plus a 6-hex-char random suffix
// makes collisions negligible, so — like savePhoto's filename generation —
// this doesn't need a uniqueness retry loop against the database.
export function generateRegistrationId() {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `EVT-${datePart}-${randomPart}`;
}
