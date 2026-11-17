import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

// POST /api/auth/setup - create initial admin if none exists
export async function POST(req: NextRequest) {
  try {
    const count = await db.admin.count();
    if (count > 0) {
      return NextResponse.json(
        { error: "Admin already exists. Please log in." },
        { status: 400 }
      );
    }
    const body = await req.json();
    const username = (body.username || "admin").toString().trim();
    const password = (body.password || "").toString();
    const name = (body.name || "School Administrator").toString().trim();
    if (!password || password.length < 4) {
      return NextResponse.json(
        { error: "Password must be at least 4 characters." },
        { status: 400 }
      );
    }
    const admin = await db.admin.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        name,
      },
    });
    // Seed default fee categories
    const defaults = [
      { description: "Monthly Tuition Fee", amount: 0 },
      { description: "Books", amount: 0 },
      { description: "Uniform", amount: 0 },
      { description: "Others", amount: 0 },
    ];
    for (const d of defaults) {
      await db.defaultFeeCategory.upsert({
        where: { description: d.description },
        update: {},
        create: d,
      });
    }
    return NextResponse.json({
      ok: true,
      message: `Admin '${username}' created. Please log in.`,
      adminId: admin.id,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Setup failed." },
      { status: 500 }
    );
  }
}

// GET - check if any admin exists
export async function GET() {
  const count = await db.admin.count();
  return NextResponse.json({ needsSetup: count === 0 });
}
