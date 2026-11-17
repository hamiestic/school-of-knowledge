import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, createSessionToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const username = (body.username || "").toString().trim();
    const password = (body.password || "").toString();
    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required." },
        { status: 400 }
      );
    }
    const admin = await db.admin.findUnique({ where: { username } });
    if (!admin || admin.passwordHash !== hashPassword(password)) {
      return NextResponse.json(
        { error: "Invalid username or password." },
        { status: 401 }
      );
    }
    const token = createSessionToken(admin.username);

    // Detect if request came through HTTPS (via proxy) to set Secure flag
    const forwardedProto = req.headers.get("x-forwarded-proto");
    const isHttps = forwardedProto === "https";

    const res = NextResponse.json({
      ok: true,
      token, // Returned in body so client can store in localStorage
      user: { username: admin.username, name: admin.name },
    });
    // Set cookie with permissive attributes for preview/proxy environments
    res.cookies.set("admin_session", token, {
      httpOnly: true,
      sameSite: "none",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Login failed." },
      { status: 500 }
    );
  }
}
