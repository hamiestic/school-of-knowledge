import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET /api/receipt/[id]?number=RCP-0001 -> fetch receipt by receipt number or by id
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const byNumber = searchParams.get("byNumber") === "1";

    let payment;
    if (byNumber) {
      payment = await db.feePayment.findFirst({
        where: { receiptNumber: id },
        include: {
          feeRecord: {
            include: { student: true, categories: true },
          },
        },
      });
    } else {
      payment = await db.feePayment.findUnique({
        where: { id },
        include: {
          feeRecord: {
            include: { student: true, categories: true },
          },
        },
      });
    }
    if (!payment) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ payment });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load receipt." },
      { status: 500 }
    );
  }
}
