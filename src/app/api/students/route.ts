import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, generateStudentId } from "@/lib/auth";

// GET /api/students?search=&class=&status=&sort=&page=&pageSize=
// sort options: name-asc, name-desc, id-asc, id-desc, class-asc, roll-asc, fee-desc, fee-asc, date-desc, date-asc
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() || "";
    const className = searchParams.get("class")?.trim() || "";
    const status = searchParams.get("status")?.trim() || "";
    const sort = searchParams.get("sort")?.trim() || "date-desc";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "1000", 10);

    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { studentId: { contains: search } },
        { fatherName: { contains: search } },
        { rollNumber: { contains: search } },
      ];
    }
    if (className) where.className = className;
    if (status) where.status = status;

    // Build orderBy based on sort parameter
    let orderBy: Record<string, "asc" | "desc"> = { createdAt: "desc" };
    switch (sort) {
      case "name-asc":
        orderBy = { name: "asc" };
        break;
      case "name-desc":
        orderBy = { name: "desc" };
        break;
      case "id-asc":
        orderBy = { studentId: "asc" };
        break;
      case "id-desc":
        orderBy = { studentId: "desc" };
        break;
      case "class-asc":
        orderBy = { className: "asc" };
        break;
      case "roll-asc":
        orderBy = { rollNumber: "asc" };
        break;
      case "fee-desc":
        orderBy = { fixedMonthlyFee: "desc" };
        break;
      case "fee-asc":
        orderBy = { fixedMonthlyFee: "asc" };
        break;
      case "date-asc":
        orderBy = { createdAt: "asc" };
        break;
      case "date-desc":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [total, students] = await Promise.all([
      db.student.count({ where }),
      db.student.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    return NextResponse.json({ total, students, page, pageSize });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load students." },
      { status: 500 }
    );
  }
}

// POST /api/students - create new student
// Required: name, className, studentIdNumber
// studentIdNumber is the number part after "SK-" prefix (user enters manually)
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const name = (body.name || "").toString().trim();
    if (!name) {
      return NextResponse.json(
        { error: "Student Name is required." },
        { status: 400 }
      );
    }

    // Class is now MANDATORY
    const className = (body.className || "").toString().trim();
    if (!className) {
      return NextResponse.json(
        { error: "Class is required. Please select a class." },
        { status: 400 }
      );
    }

    // Student ID number is now manually entered by the user
    // "SK-" prefix is permanent, user provides the number part
    const studentIdNumber = (body.studentIdNumber || "").toString().trim();
    if (!studentIdNumber) {
      return NextResponse.json(
        { error: "Student ID Number is required. Enter a number after SK-." },
        { status: 400 }
      );
    }
    // Construct full student ID: SK-{number}
    const studentId = `SK-${studentIdNumber}`;

    // Check Student ID uniqueness (must be globally unique)
    const existingId = await db.student.findFirst({
      where: { studentId },
    });
    if (existingId) {
      return NextResponse.json(
        {
          error: `Student ID "${studentId}" already exists. Please use a different number.`,
        },
        { status: 400 }
      );
    }

    const fatherName = body.fatherName ? String(body.fatherName).trim() : null;
    const rollNumber = body.rollNumber ? String(body.rollNumber).trim() : null;
    const fixedMonthlyFee = body.fixedMonthlyFee
      ? parseFloat(body.fixedMonthlyFee)
      : 0;
    if (isNaN(fixedMonthlyFee) || fixedMonthlyFee < 0) {
      return NextResponse.json(
        { error: "Fixed Monthly Fee must be a non-negative number." },
        { status: 400 }
      );
    }
    // Roll number uniqueness check per class
    if (rollNumber && className) {
      const existing = await db.student.findFirst({
        where: {
          className,
          rollNumber,
          status: "ACTIVE",
        },
      });
      if (existing) {
        return NextResponse.json(
          {
            error: `Roll number "${rollNumber}" already exists in class "${className}". Please use a different roll number.`,
          },
          { status: 400 }
        );
      }
    }
    const student = await db.student.create({
      data: {
        studentId,
        name,
        fatherName,
        className,
        rollNumber,
        fixedMonthlyFee,
        status: "ACTIVE",
      },
    });
    // Serialize manually to avoid Turbopack module reference issues
    const safeStudent = {
      id: student.id,
      studentId: student.studentId,
      name: student.name,
      fatherName: student.fatherName,
      className: student.className,
      rollNumber: student.rollNumber,
      fixedMonthlyFee: student.fixedMonthlyFee,
      status: student.status,
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    };
    return NextResponse.json({ ok: true, student: safeStudent });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to create student." },
      { status: 500 }
    );
  }
}
