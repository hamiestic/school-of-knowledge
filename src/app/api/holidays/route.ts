import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET /api/holidays?year=&month=
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const where: Record<string, unknown> = {};
    if (year && month) {
      const m = parseInt(month, 10);
      const y = parseInt(year, 10);
      const start = `${y}-${String(m).padStart(2, "0")}-01`;
      const end = `${y}-${String(m).padStart(2, "0")}-31`;
      where.date = { gte: start, lte: end };
    } else if (year) {
      where.date = { gte: `${year}-01-01`, lte: `${year}-12-31` };
    }
    const holidays = await db.holiday.findMany({
      where,
      orderBy: { date: "asc" },
    });
    return NextResponse.json({ holidays });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load holidays." },
      { status: 500 }
    );
  }
}

// POST /api/holidays - mark a date as holiday
// Body: { date: "YYYY-MM-DD", label: "Sunday" | "School Holiday" | ... }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const date = (body.date || "").toString().trim();
    const label = (body.label || "Holiday").toString().trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Date must be in YYYY-MM-DD format." },
        { status: 400 }
      );
    }
    const holiday = await db.holiday.upsert({
      where: { date },
      update: { label },
      create: { date, label },
    });
    return NextResponse.json({ ok: true, holiday });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to mark holiday." },
      { status: 500 }
    );
  }
}
