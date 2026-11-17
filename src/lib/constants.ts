// Shared constants and types for the School Management System UI

export const SCHOOL = {
  name: "School of Knowledge",
  phones: "03037692364 / 03091585999",
  address:
    "Noorpura Main Bazar, Satiana Road, Faisalabad, Pakistan",
  established: "EST. 2010",
  logo: "/school-logo.jpg",
};

// Fixed class order for display and print
export const CLASS_ORDER = [
  "Pre 1",
  "Pre 2",
  "Pre 3",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
];

// Sort classes by the predefined order; unknown classes go last alphabetically
export function sortClassesByOrder(classes: string[]): string[] {
  return [...classes].sort((a, b) => {
    const ia = CLASS_ORDER.indexOf(a);
    const ib = CLASS_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
}

// Year options: 3 years back to 10 years forward (for long-term use till 2030+)
export function getYearOptions(): number[] {
  const cur = new Date().getFullYear();
  return Array.from({ length: 14 }, (_, i) => cur - 3 + i);
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

export const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const DEFAULT_CATEGORIES = [
  "Monthly Tuition Fee",
  "Books",
  "Uniform",
  "Others",
];

export const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-300",
  PARTIAL: "bg-amber-100 text-amber-700 border-amber-300",
  UNPAID: "bg-rose-100 text-rose-700 border-rose-300",
};

export const HOLIDAY_LABELS = [
  "Sunday",
  "School Holiday",
  "Public Holiday",
  "Custom Holiday",
];

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function formatDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTH_SHORT[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

export function formatMoney(n: number): string {
  if (isNaN(n)) n = 0;
  return `Rs. ${n.toLocaleString("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function todayISO(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 10);
}

export type ViewKey =
  | "dashboard"
  | "students"
  | "fees"
  | "attendance"
  | "reports"
  | "settings";

export interface Student {
  id: string;
  studentId: string;
  name: string;
  fatherName: string | null;
  className: string | null;
  rollNumber: string | null;
  fixedMonthlyFee: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeeCategory {
  id: string;
  description: string;
  amount: number;
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  amountPaid: number;
  paymentDate: string;
  remarks: string | null;
  createdAt: string;
}

export interface FeeRecord {
  id: string;
  studentId: string;
  month: number;
  year: number;
  totalAmount: number;
  amountPaid: number;
  remainingBalance: number;
  previousOutstanding: number;
  totalPayable: number;
  status: string;
  remarks: string | null;
  createdAt: string;
  updatedAt: string;
  student?: Student;
  categories?: FeeCategory[];
  payments?: FeePayment[];
}
