import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "admin_token";
const TOKEN_TTL = "8h";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable. Set it in .env.local");
  }
  return secret;
}

export function signToken(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, getSecret());
  } catch {
    return null;
  }
}

// Route handlers receive a NextRequest, which exposes cookies via .cookies.get().
// This verifies the JWT signature/expiry, not just cookie presence — the real
// authorization boundary lives here (and in the pages), since middleware only
// does a cheap presence check at the edge (see middleware.js for why).
export function getAuthFromRequest(request) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
