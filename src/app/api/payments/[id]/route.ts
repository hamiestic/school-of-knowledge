import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, recomputeFeeRecord } from "@/lib/auth";

// GET /api/payments/[id] - fetch a single receipt/payment
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payment = await db.feePayment.findUnique({
      where: { id },
      include: {
        feeRecord: {
          include: { student: true, categories: true, payments: true },
        },
      },
    });
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

// DELETE /api/payments/[id] - reverse a payment
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const payment = await db.feePayment.findUnique({ where: { id } });
    if (!payment) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 }
      );
    }
    const feeRecordId = payment.feeRecordId;
    await db.feePayment.delete({ where: { id } });
    await recomputeFeeRecord(feeRecordId);
    return NextResponse.json({
      ok: true,
      message: "Payment reversed. Receipt " + payment.receiptNumber + " voided.",
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to reverse payment." },
      { status: 500 }
    );
  }
}
