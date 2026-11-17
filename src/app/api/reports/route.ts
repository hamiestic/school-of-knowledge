import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, MONTHS } from "@/lib/auth";

// GET /api/reports?studentId=&class=&month=&year=&status=&search=&sort=
// sort options: student-asc, student-desc, id-asc, month-desc, month-asc, total-desc, paid-desc, balance-desc, status
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId")?.trim() || "";
    const className = searchParams.get("class")?.trim() || "";
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";
    const sort = searchParams.get("sort")?.trim() || "month-desc";

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (status) where.status = status;
    if (className || search) {
      where.student = {} as Record<string, unknown>;
      if (className) (where.student as Record<string, unknown>).className = className;
      if (search) {
        (where.student as Record<string, unknown>).OR = [
          { name: { contains: search } },
          { studentId: { contains: search } },
        ];
      }
    }

    // Build orderBy based on sort parameter
    let orderBy: Record<string, "asc" | "desc">[] | Record<string, "asc" | "desc"> = [
      { year: "desc" },
      { month: "desc" },
    ];
    switch (sort) {
      case "student-asc":
        orderBy = [{ student: { name: "asc" as const } }] as unknown as Record<string, "asc" | "desc">[];
        break;
      case "student-desc":
        orderBy = [{ student: { name: "desc" as const } }] as unknown as Record<string, "asc" | "desc">[];
        break;
      case "id-asc":
        orderBy = [{ student: { studentId: "asc" as const } }] as unknown as Record<string, "asc" | "desc">[];
        break;
      case "month-asc":
        orderBy = [{ year: "asc" }, { month: "asc" }];
        break;
      case "total-desc":
        orderBy = { totalPayable: "desc" };
        break;
      case "paid-desc":
        orderBy = { amountPaid: "desc" };
        break;
      case "balance-desc":
        orderBy = { remainingBalance: "desc" };
        break;
      case "status":
        orderBy = { status: "asc" };
        break;
      case "month-desc":
      default:
        orderBy = [{ year: "desc" }, { month: "desc" }];
        break;
    }

    const records = await db.feeRecord.findMany({
      where,
      orderBy: orderBy as Record<string, "asc" | "desc">[],
      include: {
        student: true,
        categories: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });

    const totalCollected = records.reduce((s, r) => s + r.amountPaid, 0);
    const totalOutstanding = records.reduce(
      (s, r) => s + r.remainingBalance,
      0
    );
    const totalExpected = records.reduce((s, r) => s + r.totalPayable, 0);

    const byStatus = {
      PAID: records.filter((r) => r.status === "PAID").length,
      PARTIAL: records.filter((r) => r.status === "PARTIAL").length,
      UNPAID: records.filter((r) => r.status === "UNPAID").length,
    };

    return NextResponse.json({
      records,
      summary: {
        count: records.length,
        totalCollected,
        totalOutstanding,
        totalExpected,
        byStatus,
      },
      months: MONTHS,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load report." },
      { status: 500 }
    );
  }
}
