import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, recomputeFeeRecord } from "@/lib/auth";

// GET /api/fees/[id] - single fee record with everything
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const record = await db.feeRecord.findUnique({
      where: { id },
      include: {
        student: true,
        categories: true,
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    if (!record) {
      return NextResponse.json(
        { error: "Fee record not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({ feeRecord: record });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load fee record." },
      { status: 500 }
    );
  }
}

// PUT /api/fees/[id] - update fee categories / remarks (not payments)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const remarks = body.remarks !== undefined ? String(body.remarks).trim() : undefined;
    const categories: Array<{ description: string; amount: number }> | undefined =
      Array.isArray(body.categories)
        ? body.categories.map((c: { description?: string; amount?: number }) => ({
            description: (c.description || "").toString().trim(),
            amount: parseFloat(String(c.amount || 0)),
          })).filter((c: { description: string; amount: number }) => c.description && !isNaN(c.amount) && c.amount >= 0)
        : undefined;

    const existing = await db.feeRecord.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Fee record not found." },
        { status: 404 }
      );
    }

    if (categories) {
      await db.feeCategory.deleteMany({ where: { feeRecordId: id } });
      if (categories.length > 0) {
        await db.feeCategory.createMany({
          data: categories.map((c) => ({
            feeRecordId: id,
            description: c.description,
            amount: c.amount,
          })),
        });
      }
    }
    if (remarks !== undefined) {
      await db.feeRecord.update({ where: { id }, data: { remarks } });
    }
    const updated = await recomputeFeeRecord(id);
    const result = await db.feeRecord.findUnique({
      where: { id },
      include: { categories: true, payments: true, student: true },
    });
    return NextResponse.json({ ok: true, feeRecord: result, recomputed: updated });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to update fee record." },
      { status: 500 }
    );
  }
}

// DELETE /api/fees/[id] - delete a fee record and its categories/payments
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.feeCategory.deleteMany({ where: { feeRecordId: id } });
    await db.feePayment.deleteMany({ where: { feeRecordId: id } });
    await db.feeRecord.delete({ where: { id } });
    return NextResponse.json({ ok: true, message: "Fee record deleted." });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete fee record." },
      { status: 500 }
    );
  }
}
