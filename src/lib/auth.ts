import { db } from "@/lib/db";
import { cookies, headers } from "next/headers";
import crypto from "crypto";

// Simple session token = base64(username) + "." + hmac
const SESSION_SECRET =
  process.env.SESSION_SECRET || "school-of-knowledge-secret-key-2026";

export function hashPassword(password: string): string {
  return crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(password)
    .digest("hex");
}

export function createSessionToken(username: string): string {
  const payload = Buffer.from(username).toString("base64");
  const sig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  return `${payload}.${sig}`;
}

export function verifySessionToken(token: string): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = crypto
    .createHmac("sha256", SESSION_SECRET)
    .update(payload)
    .digest("hex");
  if (sig !== expectedSig) return null;
  try {
    return Buffer.from(payload, "base64").toString("utf8");
  } catch {
    return null;
  }
}

// Extract token: check Authorization header first, then cookie
export async function extractToken(): Promise<string | null> {
  // 1. Check Authorization header (Bearer token from localStorage)
  const headerStore = await headers();
  const authHeader =
    headerStore.get("authorization") || headerStore.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  // 2. Check cookie (fallback for same-origin)
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get("admin_session")?.value;
  if (cookieToken) return cookieToken;
  return null;
}

export async function getAuthenticatedAdmin(): Promise<{
  username: string;
  name: string | null;
} | null> {
  const token = await extractToken();
  if (!token) return null;
  const username = verifySessionToken(token);
  if (!username) return null;
  const admin = await db.admin.findUnique({ where: { username } });
  if (!admin) return null;
  return { username: admin.username, name: admin.name };
}

export async function requireAdmin() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    throw new Error("UNAUTHORIZED");
  }
  return admin;
}

// Generate sequential Student ID like SK-0001
export async function generateStudentId(): Promise<string> {
  const counter = await db.counter.upsert({
    where: { id: "student" },
    update: { value: { increment: 1 } },
    create: { id: "student", value: 1 },
  });
  return `SK-${String(counter.value).padStart(4, "0")}`;
}

// Generate sequential Receipt Number like RCP-0001
export async function generateReceiptNumber(): Promise<string> {
  const counter = await db.counter.upsert({
    where: { id: "receipt" },
    update: { value: { increment: 1 } },
    create: { id: "receipt", value: 1 },
  });
  return `RCP-${String(counter.value).padStart(4, "0")}`;
}

// Get the previous month's outstanding balance for a student
export async function getPreviousOutstanding(
  studentId: string,
  currentMonth: number,
  currentYear: number
): Promise<number> {
  let prevMonth = currentMonth - 1;
  let prevYear = currentYear;
  if (prevMonth === 0) {
    prevMonth = 12;
    prevYear = currentYear - 1;
  }
  const prevRecord = await db.feeRecord.findUnique({
    where: {
      studentId_month_year: {
        studentId,
        month: prevMonth,
        year: prevYear,
      },
    },
  });
  return prevRecord?.remainingBalance ?? 0;
}

// Recompute fee record totals based on categories and payments
export async function recomputeFeeRecord(feeRecordId: string) {
  const [categories, payments] = await Promise.all([
    db.feeCategory.findMany({ where: { feeRecordId } }),
    db.feePayment.findMany({ where: { feeRecordId } }),
  ]);
  const totalAmount = categories.reduce((s, c) => s + c.amount, 0);
  const amountPaid = payments.reduce((s, p) => s + p.amountPaid, 0);
  const record = await db.feeRecord.findUnique({
    where: { id: feeRecordId },
  });
  if (!record) return null;
  const previousOutstanding = record.previousOutstanding;
  const totalPayable = totalAmount + previousOutstanding;
  const remainingBalance = totalPayable - amountPaid;
  let status = "UNPAID";
  if (amountPaid <= 0) status = "UNPAID";
  else if (amountPaid >= totalPayable) status = "PAID";
  else status = "PARTIAL";
  return db.feeRecord.update({
    where: { id: feeRecordId },
    data: {
      totalAmount,
      amountPaid,
      totalPayable,
      remainingBalance,
      status,
    },
  });
}

export const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}
