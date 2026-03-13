/** @type {import('next/server').NextRequest} */
import { NextResponse } from "next/server";

export function middleware(request) {
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
  matcher: ["/mycodao.financial", "/mycodao.financial/:path*"],
};
