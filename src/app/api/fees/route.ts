import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireAdmin,
  getPreviousOutstanding,
  recomputeFeeRecord,
  MONTHS,
} from "@/lib/auth";

// GET /api/fees?studentId=&month=&year=&class=&status=&search=
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId")?.trim() || "";
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const className = searchParams.get("class")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const search = searchParams.get("search")?.trim() || "";

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (month) where.month = parseInt(month, 10);
    if (year) where.year = parseInt(year, 10);
    if (status) where.status = status;
    if (className || search) {
      where.student = {};
      if (className) where.student.className = className;
      if (search) {
        where.student.OR = [
          { name: { contains: search } },
          { studentId: { contains: search } },
        ];
      }
    }

    const records = await db.feeRecord.findMany({
      where,
      orderBy: [{ year: "desc" }, { month: "desc" }],
      include: {
        student: true,
        categories: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    return NextResponse.json({ records });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load fee records." },
      { status: 500 }
    );
  }
}

// POST /api/fees - create a fee record for a student/month/year
// Body: { studentId, month, year, categories: [{description, amount}], remarks? }
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const studentId = (body.studentId || "").toString().trim();
    const month = parseInt(body.month, 10);
    const year = parseInt(body.year, 10);
    const remarks = body.remarks ? String(body.remarks).trim() : null;
    const categories: Array<{ description: string; amount: number }> =
      Array.isArray(body.categories) ? body.categories : [];

    if (!studentId) {
      return NextResponse.json(
        { error: "Student is required." },
        { status: 400 }
      );
    }
    if (!month || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Valid month is required (1-12)." },
        { status: 400 }
      );
    }
    if (!year || year < 2000) {
      return NextResponse.json(
        { error: "Valid year is required." },
        { status: 400 }
      );
    }
    const student = await db.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }

    // Validate categories
    const cleanCategories = categories
      .map((c) => ({
        description: (c.description || "").toString().trim(),
        amount: parseFloat(String(c.amount || 0)),
      }))
      .filter((c) => c.description && !isNaN(c.amount) && c.amount >= 0);
    const totalAmount = cleanCategories.reduce((s, c) => s + c.amount, 0);
    const previousOutstanding = await getPreviousOutstanding(
      studentId,
      month,
      year
    );
    const totalPayable = totalAmount + previousOutstanding;

    // Prevent duplicates - upsert the fee record
    const feeRecord = await db.feeRecord.upsert({
      where: {
        studentId_month_year: { studentId, month, year },
      },
      update: {
        totalAmount,
        totalPayable,
        previousOutstanding,
        remarks,
        // recompute balances (without touching payments)
        remainingBalance: totalPayable, // will be recomputed below
        status: "UNPAID",
      },
      create: {
        studentId,
        month,
        year,
        totalAmount,
        previousOutstanding,
        totalPayable,
        remainingBalance: totalPayable,
        amountPaid: 0,
        status: "UNPAID",
        remarks,
      },
    });

    // Replace categories
    await db.feeCategory.deleteMany({
      where: { feeRecordId: feeRecord.id },
    });
    if (cleanCategories.length > 0) {
      await db.feeCategory.createMany({
        data: cleanCategories.map((c) => ({
          feeRecordId: feeRecord.id,
          description: c.description,
          amount: c.amount,
        })),
      });
    }

    const updated = await recomputeFeeRecord(feeRecord.id);
    const result = await db.feeRecord.findUnique({
      where: { id: feeRecord.id },
      include: { categories: true, payments: true, student: true },
    });
    return NextResponse.json({
      ok: true,
      feeRecord: result,
      recomputed: updated,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create fee record." },
      { status: 500 }
    );
  }
}

export { MONTHS };
