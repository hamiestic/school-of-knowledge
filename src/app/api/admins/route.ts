import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword } from "@/lib/auth";

// GET /api/admins - list all admins (without password hashes)
export async function GET() {
  try {
    await requireAdmin();
    const admins = await db.admin.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ admins });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load admins." },
      { status: 500 }
    );
  }
}

// POST /api/admins - create a new admin account
// Body: { username, password, name? }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const username = (body.username || "").toString().trim();
    const password = (body.password || "").toString();
    const name = body.name ? String(body.name).trim() : null;
    if (!username) {
      return NextResponse.json(
        { error: "Username is required." },
        { status: 400 }
      );
    }
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }
    // Check uniqueness
    const existing = await db.admin.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json(
        { error: `Username '${username}' already exists. Choose a different one.` },
        { status: 400 }
      );
    }
    const admin = await db.admin.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        name,
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
      },
    });
    return NextResponse.json({
      ok: true,
      admin,
      message: `Admin account '${username}' created successfully.`,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create admin." },
      { status: 500 }
    );
  }
}
