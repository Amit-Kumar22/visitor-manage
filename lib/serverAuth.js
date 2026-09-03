import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken } from "@/lib/auth";

// For Server Components (pages), which run in the Node.js runtime and so can
// actually verify the JWT — unlike middleware, which only checks for cookie
// presence (see middleware.js).
export async function getServerAuth() {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;
  return token ? verifyToken(token) : null;
}
