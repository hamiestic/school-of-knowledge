import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, hashPassword, getAuthenticatedAdmin } from "@/lib/auth";

// DELETE /api/admins/[id] - delete an admin (cannot delete yourself)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const me = await requireAdmin();
    const { id } = await params;
    if (me.username === (await db.admin.findUnique({ where: { id } }))?.username) {
      return NextResponse.json(
        { error: "You cannot delete your own account while logged in." },
        { status: 400 }
      );
    }
    // Prevent deleting the last admin
    const count = await db.admin.count();
    if (count <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last admin account." },
        { status: 400 }
      );
    }
    await db.admin.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Admin account deleted." });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete admin." },
      { status: 500 }
    );
  }
}

// PUT /api/admins/[id] - update an admin's name or password
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      data.name = String(body.name).trim() || null;
    }
    if (body.password !== undefined) {
      const pwd = String(body.password);
      if (pwd.length < 4) {
        return NextResponse.json(
          { error: "Password must be at least 4 characters." },
          { status: 400 }
        );
      }
      data.passwordHash = hashPassword(pwd);
    }
    if (body.username !== undefined) {
      const username = String(body.username).trim();
      if (!username) {
        return NextResponse.json(
          { error: "Username cannot be empty." },
          { status: 400 }
        );
      }
      // Check uniqueness (excluding self)
      const existing = await db.admin.findUnique({ where: { username } });
      if (existing && existing.id !== id) {
        return NextResponse.json(
          { error: `Username '${username}' already exists.` },
          { status: 400 }
        );
      }
      data.username = username;
    }
    const admin = await db.admin.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, createdAt: true },
    });
    return NextResponse.json({
      ok: true,
      admin,
      message: "Admin account updated.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update admin." },
      { status: 500 }
    );
  }
}

// GET current admin info for /api/admins/me-style lookup
export async function GET() {
  try {
    const me = await getAuthenticatedAdmin();
    if (!me) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ user: me });
  } catch {
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
