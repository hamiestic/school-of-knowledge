import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// DELETE /api/holidays/[date] - remove holiday marking
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ date: string }> }
) {
  try {
    await requireAdmin();
    const { date } = await params;
    await db.holiday.delete({ where: { date } });
    return NextResponse.json({ ok: true, message: "Holiday removed." });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to remove holiday." },
      { status: 500 }
    );
  }
}
