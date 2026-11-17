import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword, getAuthenticatedAdmin } from "@/lib/auth";

// POST /api/auth/change-password - change own password
// Body: { currentPassword, newPassword }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const me = await getAuthenticatedAdmin();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const currentPassword = (body.currentPassword || "").toString();
    const newPassword = (body.newPassword || "").toString();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current and new passwords are required." },
        { status: 400 }
      );
    }
    if (newPassword.length < 4) {
      return NextResponse.json(
        { error: "New password must be at least 4 characters." },
        { status: 400 }
      );
    }
    const admin = await db.admin.findUnique({ where: { username: me.username } });
    if (!admin || admin.passwordHash !== hashPassword(currentPassword)) {
      return NextResponse.json(
        { error: "Current password is incorrect." },
        { status: 400 }
      );
    }
    await db.admin.update({
      where: { id: admin.id },
      data: { passwordHash: hashPassword(newPassword) },
    });
    return NextResponse.json({
      ok: true,
      message: "Password changed successfully.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to change password." },
      { status: 500 }
    );
  }
}
