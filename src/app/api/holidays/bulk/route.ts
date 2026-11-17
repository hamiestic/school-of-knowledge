import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// POST /api/holidays/bulk - set all holidays for a month in one call
// Body: { year, month, holidays: [{date: "YYYY-MM-DD", label: "Sunday"}, ...] }
// This REPLACES all holidays for the given month with the provided list
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const year = parseInt(body.year, 10);
    const month = parseInt(body.month, 10);
    const holidays: Array<{ date: string; label: string }> = Array.isArray(
      body.holidays
    )
      ? body.holidays
      : [];

    if (!year || !month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Valid year and month are required." },
        { status: 400 }
      );
    }

    // Validate all dates
    const monthPrefix = `${year}-${String(month).padStart(2, "0")}`;
    const validHolidays = holidays.filter((h) => {
      if (!h.date || !/^\d{4}-\d{2}-\d{2}$/.test(h.date)) return false;
      if (!h.date.startsWith(monthPrefix)) return false;
      return true;
    });

    // Delete existing holidays for this month
    await db.holiday.deleteMany({
      where: {
        date: {
          gte: `${monthPrefix}-01`,
          lte: `${monthPrefix}-31`,
        },
      },
    });

    // Insert new holidays
    if (validHolidays.length > 0) {
      // Use a transaction for efficiency
      await db.$transaction(
        validHolidays.map((h) =>
          db.holiday.create({
            data: {
              date: h.date,
              label: h.label || "Holiday",
            },
          })
        )
      );
    }

    return NextResponse.json({
      ok: true,
      count: validHolidays.length,
      message: `${validHolidays.length} holiday(s) saved for ${monthPrefix}.`,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save holidays." },
      { status: 500 }
    );
  }
}
