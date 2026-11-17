import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET /api/students/[id] - single student with their fee records
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const student = await db.student.findUnique({
      where: { id },
      include: {
        feeRecords: {
          orderBy: [{ year: "desc" }, { month: "desc" }],
          include: {
            categories: true,
            payments: { orderBy: { createdAt: "desc" } },
          },
        },
      },
    });
    if (!student) {
      return NextResponse.json(
        { error: "Student not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ student });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load student." },
      { status: 500 }
    );
  }
}

// PUT /api/students/[id] - update student (Student ID never changes)
// Supports partial updates: if only status is sent, only status is updated
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    // Check if this is a full edit (has name) or partial update (status only)
    const isFullEdit = body.name !== undefined;

    if (isFullEdit) {
      const name = (body.name || "").toString().trim();
      if (!name) {
        return NextResponse.json(
          { error: "Student Name is required." },
          { status: 400 }
        );
      }
    }

    // Build update data - only include fields that are provided
    const data: Record<string, unknown> = {};

    if (isFullEdit) {
      data.name = (body.name || "").toString().trim();
      data.fatherName = body.fatherName
        ? String(body.fatherName).trim()
        : null;

      // Class is now mandatory
      const className = (body.className || "").toString().trim();
      if (!className) {
        return NextResponse.json(
          { error: "Class is required." },
          { status: 400 }
        );
      }
      data.className = className;

      data.rollNumber = body.rollNumber
        ? String(body.rollNumber).trim()
        : null;
      data.fixedMonthlyFee = body.fixedMonthlyFee
        ? parseFloat(body.fixedMonthlyFee)
        : 0;

      // Student ID can be updated (if studentIdNumber is provided)
      if (body.studentIdNumber !== undefined) {
        const studentIdNumber = String(body.studentIdNumber).trim();
        if (!studentIdNumber) {
          return NextResponse.json(
            { error: "Student ID Number is required." },
            { status: 400 }
          );
        }
        const newStudentId = `SK-${studentIdNumber}`;
        // Check uniqueness (exclude self)
        const existingId = await db.student.findFirst({
          where: {
            studentId: newStudentId,
            id: { not: id },
          },
        });
        if (existingId) {
          return NextResponse.json(
            {
              error: `Student ID "${newStudentId}" already exists. Please use a different number.`,
            },
            { status: 400 }
          );
        }
        data.studentId = newStudentId;
      }

      // Roll number uniqueness check per class (exclude self)
      if (data.rollNumber && data.className) {
        const existing = await db.student.findFirst({
          where: {
            className: data.className as string,
            rollNumber: data.rollNumber as string,
            status: "ACTIVE",
            id: { not: id },
          },
        });
        if (existing) {
          return NextResponse.json(
            {
              error: `Roll number "${data.rollNumber}" already exists in class "${data.className}". Please use a different roll number.`,
            },
            { status: 400 }
          );
        }
      }
    }

    // Status can be updated in both full and partial modes
    if (body.status !== undefined && ["ACTIVE", "INACTIVE"].includes(body.status)) {
      data.status = body.status;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: "No fields to update." },
        { status: 400 }
      );
    }

    const student = await db.student.update({ where: { id }, data });
    return NextResponse.json({ ok: true, student });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update student." },
      { status: 500 }
    );
  }
}

// DELETE /api/students/[id]
// - If student has fee records with outstanding balance (due > 0): SOFT delete only (preserve history)
// - If student has fee records but all are fully paid (due = 0): allow PERMANENT delete
// - If student has no fee records: allow PERMANENT delete
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    // Check for fee records with outstanding balance
    const feeRecords = await db.feeRecord.findMany({
      where: { studentId: id },
      select: { remainingBalance: true },
    });

    const totalOutstanding = feeRecords.reduce(
      (sum, r) => sum + r.remainingBalance,
      0
    );

    if (totalOutstanding > 0) {
      // Student has unpaid dues - only soft delete to preserve records
      const student = await db.student.update({
        where: { id },
        data: { status: "INACTIVE" },
      });
      return NextResponse.json({
        ok: true,
        softDeleted: true,
        message: `Student marked as Inactive. Outstanding dues: Rs. ${totalOutstanding}. Clear all dues before permanent deletion.`,
        student,
      });
    }

    // No outstanding dues - check if there are any fee records at all
    if (feeRecords.length > 0) {
      // Has fee records but all paid - need to clean up references before deleting
      // Delete fee categories, payments, and records (cascade)
      const feeRecordIds = await db.feeRecord.findMany({
        where: { studentId: id },
        select: { id: true },
      });
      for (const fr of feeRecordIds) {
        await db.feeCategory.deleteMany({
          where: { feeRecordId: fr.id },
        });
        await db.feePayment.deleteMany({
          where: { feeRecordId: fr.id },
        });
      }
      await db.feeRecord.deleteMany({ where: { studentId: id } });
    }

    // Now permanently delete the student
    await db.student.delete({ where: { id } });

    return NextResponse.json({
      ok: true,
      permanent: true,
      message:
        feeRecords.length > 0
          ? `Student permanently deleted. ${feeRecords.length} paid fee record(s) were also removed.`
          : "Student permanently deleted (no fee records existed).",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete student." },
      { status: 500 }
    );
  }
}
