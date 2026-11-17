import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sortClassesByOrder } from "@/lib/constants";

// GET /api/classes - distinct class names from students, sorted by CLASS_ORDER
export async function GET() {
  try {
    await requireAdmin();
    const students = await db.student.findMany({
      where: { status: "ACTIVE", className: { not: null } },
      select: { className: true },
      distinct: ["className"],
    });
    const classes = sortClassesByOrder(
      students
        .map((s) => s.className as string)
        .filter(Boolean)
    );
    return NextResponse.json({ classes });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load classes." },
      { status: 500 }
    );
  }
}
