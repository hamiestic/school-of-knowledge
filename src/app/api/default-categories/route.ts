import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

// GET default categories
export async function GET() {
  try {
    await requireAdmin();
    const cats = await db.defaultFeeCategory.findMany({
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({ categories: cats });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to load categories." },
      { status: 500 }
    );
  }
}

// POST /api/default-categories - add or update a default category
export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const description = (body.description || "").toString().trim();
    const amount = body.amount ? parseFloat(body.amount) : 0;
    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }
    const cat = await db.defaultFeeCategory.upsert({
      where: { description },
      update: { amount },
      create: { description, amount },
    });
    return NextResponse.json({ ok: true, category: cat });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to save category." },
      { status: 500 }
    );
  }
}

// DELETE /api/default-categories?description=
export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const description = searchParams.get("description") || "";
    if (!description) {
      return NextResponse.json(
        { error: "Description is required." },
        { status: 400 }
      );
    }
    await db.defaultFeeCategory.delete({ where: { description } });
    return NextResponse.json({ ok: true, message: "Category deleted." });
  } catch (e) {
    if (e instanceof Error && e.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed to delete category." },
      { status: 500 }
    );
  }
}
