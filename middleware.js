import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

// Next.js Middleware always runs on the Edge runtime, which can't run
// jsonwebtoken (it needs Node's crypto module). So this only does a cheap
// "is there a cookie at all" check to bounce obviously-unauthenticated
// requests early with a redirect / 401. The real authorization check —
// verifying the JWT's signature and expiry — happens in the route handlers
// and the dashboard page itself (both run in the Node.js runtime), via
// getAuthFromRequest() in lib/auth.js. That's the actual security boundary;
// this middleware is only a UX/latency shortcut in front of it.
export function middleware(request) {
  const { pathname } = request.nextUrl;
  const hasCookie = Boolean(request.cookies.get(AUTH_COOKIE)?.value);

  const isProtectedPage = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isProtectedPage && !hasCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isProtectedApi =
    (pathname === "/api/visitors" && request.method === "GET") ||
    /^\/api\/visitors\/[^/]+$/.test(pathname) ||
    pathname === "/api/users" ||
    /^\/api\/users\/[^/]+$/.test(pathname);
  if (isProtectedApi && !hasCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/visitors", "/api/visitors/:id*", "/api/users", "/api/users/:id*"],
};
