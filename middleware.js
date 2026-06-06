/** @type {import('next/server').NextRequest} */
import { NextResponse } from "next/server";

const PULSE_HOST = "pulse.mycodao.com";

export function middleware(request) {
  const host = request.headers.get("host")?.split(":")[0] ?? "";
  // Live Pulse hostname: send / to the dashboard (Cloudflare Tunnel or direct).
  if (host === PULSE_HOST && request.nextUrl.pathname === "/") {
    const dest = new URL("/pulse/", request.url);
    dest.search = request.nextUrl.search;
    dest.hash = request.nextUrl.hash;
    return NextResponse.redirect(dest);
  }

  // In dev, app is served at / (no basePath). Redirect /mycodao.financial -> / so old links work.
  if (process.env.NODE_ENV !== "production" && request.nextUrl.pathname.startsWith("/mycodao.financial")) {
    const path = request.nextUrl.pathname.slice("/mycodao.financial".length) || "/";
    const url = new URL(path, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/mycodao.financial", "/mycodao.financial/:path*"],
};
