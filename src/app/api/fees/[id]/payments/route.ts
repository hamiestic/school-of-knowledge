import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireAdmin,
  generateReceiptNumber,
  recomputeFeeRecord,
} from "@/lib/auth";

// POST /api/fees/[id]/payments - add a payment (creates receipt)
// Body: { amountPaid, paymentDate, remarks? }
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const amountPaid = parseFloat(String(body.amountPaid || 0));
    const paymentDateStr = (body.paymentDate || "").toString();
    const remarks = body.remarks ? String(body.remarks).trim() : null;

    if (isNaN(amountPaid) || amountPaid <= 0) {
      return NextResponse.json(
        { error: "Amount Paid must be greater than 0." },
        { status: 400 }
      );
    }
    if (!paymentDateStr) {
      return NextResponse.json(
        { error: "Payment Date is required." },
        { status: 400 }
      );
    }
    const paymentDate = new Date(paymentDateStr);
    if (isNaN(paymentDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid payment date." },
        { status: 400 }
      );
    }
    const feeRecord = await db.feeRecord.findUnique({
      where: { id },
      include: { payments: true, student: true },
    });
    if (!feeRecord) {
      return NextResponse.json(
        { error: "Fee record not found." },
        { status: 404 }
      );
    }

    const receiptNumber = await generateReceiptNumber();
    const payment = await db.feePayment.create({
      data: {
        feeRecordId: id,
        receiptNumber,
        amountPaid,
        paymentDate,
        remarks,
      },
    });
    await recomputeFeeRecord(id);
    const result = await db.feeRecord.findUnique({
      where: { id },
      include: { categories: true, payments: true, student: true },
    });
    return NextResponse.json({
      ok: true,
      payment,
      feeRecord: result,
      receiptNumber,
    });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to record payment." },
      { status: 500 }
    );
  }
}
