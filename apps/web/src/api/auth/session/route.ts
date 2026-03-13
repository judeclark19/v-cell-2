/*
  1. receive idToken from the client
  2. verify it with Firebase Admin
  3. create a session cookie
  4. set an HTTP‑only cookie the middleware can read
*/

import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

const SESSION_EXPIRES_IN = 60 * 60 * 24 * 5 * 1000; // 5 days

export async function POST(req: Request) {
  try {
    const { idToken } = await req.json();

    if (!idToken) {
      return NextResponse.json({ error: "Missing idToken" }, { status: 400 });
    }

    // Verify the ID token
    await adminAuth.verifyIdToken(idToken);

    // Create a session cookie
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRES_IN
    });

    const response = NextResponse.json({ success: true });

    // Set HTTP‑only cookie for middleware/server use
    response.cookies.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: SESSION_EXPIRES_IN / 1000,
      path: "/"
    });

    return response;
  } catch (err) {
    console.error("Session creation failed", err);

    return NextResponse.json(
      { error: "Session creation failed" },
      { status: 401 }
    );
  }
}
