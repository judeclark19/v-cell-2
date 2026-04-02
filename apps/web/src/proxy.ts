import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const session = req.cookies.get("session")?.value;
  const { pathname } = req.nextUrl;

  const isAuth = Boolean(session);

  // prevent logged-in users from seeing login
  if ((pathname === "/" || pathname === "/login") && isAuth) {
    const gameUrl = new URL("/game", req.url);
    return NextResponse.redirect(gameUrl);
  }

  return NextResponse.next();
}
