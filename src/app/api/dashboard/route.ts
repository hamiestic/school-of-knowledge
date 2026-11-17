import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, MONTHS } from "@/lib/auth";
import { sortClassesByOrder } from "@/lib/constants";

// GET /api/dashboard?month=11&year=2026 - aggregate stats for a specific month
// Defaults to current month/year if not provided
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const monthParam = searchParams.get("month");
    const yearParam = searchParams.get("year");

    const now = new Date();
    const selectedMonth = monthParam
      ? parseInt(monthParam, 10)
      : now.getMonth() + 1;
    const selectedYear = yearParam
      ? parseInt(yearParam, 10)
      : now.getFullYear();

    if (
      isNaN(selectedMonth) ||
      selectedMonth < 1 ||
      selectedMonth > 12 ||
      isNaN(selectedYear)
    ) {
      return NextResponse.json(
        { error: "Invalid month or year." },
        { status: 400 }
      );
    }

    const [
      totalStudents,
      activeStudents,
      allStudents,
      selectedMonthRecords,
      allRecords,
      recentPaymentsRaw,
    ] = await Promise.all([
      db.student.count(),
      db.student.count({ where: { status: "ACTIVE" } }),
      db.student.findMany({
        where: { status: "ACTIVE" },
        select: { className: true, fixedMonthlyFee: true },
      }),
      db.feeRecord.findMany({
        where: { month: selectedMonth, year: selectedYear },
        include: { payments: true },
      }),
      db.feeRecord.findMany({
        include: { payments: true },
      }),
      db.feePayment.findMany({
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          feeRecord: { include: { student: true } },
        },
      }),
    ]);

    // Total expected monthly fee = sum of fixedMonthlyFee for active students
    const totalExpectedMonthly = allStudents.reduce(
      (s, st) => s + (st.fixedMonthlyFee || 0),
      0
    );

    // Total fee collected in the SELECTED month
    const totalCollectedSelectedMonth = selectedMonthRecords.reduce(
      (s, r) => s + r.amountPaid,
      0
    );

    // Monthly remaining = Expected - Collected (for the selected month)
    const totalRemainingMonthly = Math.max(
      0,
      totalExpectedMonthly - totalCollectedSelectedMonth
    );

    // Outstanding dues for the selected month = Expected - Collected
    // This includes students who haven't paid at all (no fee record) AND
    // students who have partial/unpaid fee records
    const outstandingSelectedMonth = totalRemainingMonthly;

    // Count of students who have fee records for the selected month
    const studentsWithRecords = selectedMonthRecords.length;

    // Count of students who haven't created fee records yet for the selected month
    const studentsWithoutRecords = Math.max(
      0,
      activeStudents - studentsWithRecords
    );

    // Total outstanding (all time - from all fee records with unpaid balance)
    const totalOutstanding = allRecords.reduce(
      (s, r) => s + r.remainingBalance,
      0
    );

    // Total collected all time
    const totalCollectedAllTime = allRecords.reduce(
      (s, r) => s + r.amountPaid,
      0
    );

    // Students per class - sorted by CLASS_ORDER
    const classMap: Record<string, number> = {};
    for (const s of allStudents) {
      const c = s.className || "Unassigned";
      classMap[c] = (classMap[c] || 0) + 1;
    }
    const studentsPerClass = sortClassesByOrder(
      Object.keys(classMap)
    ).map((className) => ({
      className,
      count: classMap[className],
    }));

    const recentPayments = recentPaymentsRaw.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amountPaid: p.amountPaid,
      paymentDate: p.paymentDate,
      studentName: p.feeRecord.student.name,
      studentId: p.feeRecord.student.studentId,
      month: p.feeRecord.month,
      year: p.feeRecord.year,
    }));

    // Check if selected month is the current month
    const isCurrentMonth =
      selectedMonth === now.getMonth() + 1 &&
      selectedYear === now.getFullYear();

    return NextResponse.json({
      totalStudents,
      activeStudents,
      inactiveStudents: totalStudents - activeStudents,
      // Selected month stats
      selectedMonth,
      selectedYear,
      selectedMonthName: MONTHS[selectedMonth - 1],
      isCurrentMonth,
      totalExpectedMonthly,
      totalCollectedSelectedMonth,
      totalRemainingMonthly,
      outstandingSelectedMonth,
      studentsWithRecords,
      studentsWithoutRecords,
      // All-time stats
      totalCollectedAllTime,
      totalOutstanding,
      studentsPerClass,
      recentPayments,
      currentMonthName: MONTHS[now.getMonth()],
      currentMonth: now.getMonth() + 1,
      currentYear: now.getFullYear(),
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load dashboard." },
      { status: 500 }
    );
  }
}
