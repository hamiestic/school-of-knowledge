"use client";

import { useCallback, useEffect, useState } from "react";
import {
  FileBarChart,
  Search,
  Printer,
  Eye,
  ChevronRight,
  Wallet,
  TrendingUp,
  AlertCircle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FeeRecord,
  Student,
  formatMoney,
  formatDate,
  MONTHS,
  STATUS_COLORS,
  SCHOOL,
  getYearOptions,
} from "@/lib/constants";
import { toast } from "sonner";

interface ReportSummary {
  count: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpected: number;
  byStatus: { PAID: number; PARTIAL: number; UNPAID: number };
}

interface StudentDetail {
  student: Student & { feeRecords: FeeRecord[] };
}

export function ReportsView() {
  const [classes, setClasses] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [monthFilter, setMonthFilter] = useState("ALL");
  const [yearFilter, setYearFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("month-desc");

  const [records, setRecords] = useState<FeeRecord[]>([]);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const [studentDetail, setStudentDetail] = useState<StudentDetail | null>(
    null
  );
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetch("/api/classes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.classes && setClasses(d.classes))
      .catch(() => {});
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (classFilter !== "ALL") params.set("class", classFilter);
    if (monthFilter !== "ALL") params.set("month", monthFilter);
    if (yearFilter !== "ALL") params.set("year", yearFilter);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("sort", sortBy);
    fetch(`/api/reports?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.records) {
          setRecords(d.records);
          setSummary(d.summary);
        }
      })
      .catch(() => toast.error("Failed to load report."))
      .finally(() => setLoading(false));
  }, [search, classFilter, monthFilter, yearFilter, statusFilter, sortBy]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  async function viewStudent(id: string) {
    setLoadingDetail(true);
    setStudentDetail(null);
    try {
      const res = await fetch(`/api/students/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (data.student) {
        setStudentDetail({ student: data.student });
      } else {
        toast.error("Student not found.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setLoadingDetail(false);
    }
  }

  const yearOptions = getYearOptions();

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold tracking-tight">Fee Reports</h2>
        <p className="text-sm text-muted-foreground">
          Search, filter, and review all fee records. Print or save as PDF.
        </p>
      </div>

      {/* Filters */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name or Student ID"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Month</Label>
              <Select value={monthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Months</SelectItem>
                  {MONTHS.map((m, i) => (
                    <SelectItem key={i} value={String(i + 1)}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Years</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                  <SelectItem value="UNPAID">Unpaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Sort By</Label>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month-desc">Month (Newest)</SelectItem>
                  <SelectItem value="month-asc">Month (Oldest)</SelectItem>
                  <SelectItem value="student-asc">Student Name (A-Z)</SelectItem>
                  <SelectItem value="student-desc">Student Name (Z-A)</SelectItem>
                  <SelectItem value="id-asc">Student ID (Low-High)</SelectItem>
                  <SelectItem value="total-desc">Total Amount (High-Low)</SelectItem>
                  <SelectItem value="paid-desc">Paid Amount (High-Low)</SelectItem>
                  <SelectItem value="balance-desc">Balance (High-Low)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 no-print">
          <SummaryCard
            label="Total Records"
            value={String(summary.count)}
            icon={FileBarChart}
            color="bg-primary/10 text-primary"
          />
          <SummaryCard
            label="Total Expected"
            value={formatMoney(summary.totalExpected)}
            icon={TrendingUp}
            color="bg-secondary/20 text-secondary-foreground"
          />
          <SummaryCard
            label="Total Collected"
            value={formatMoney(summary.totalCollected)}
            icon={Wallet}
            color="bg-emerald-100 text-emerald-700"
          />
          <SummaryCard
            label="Total Outstanding"
            value={formatMoney(summary.totalOutstanding)}
            icon={AlertCircle}
            color="bg-rose-100 text-rose-700"
          />
        </div>
      )}

      {/* Status breakdown */}
      {summary && (
        <Card className="no-print">
          <CardContent className="p-4 flex items-center gap-4 flex-wrap">
            <span className="text-sm text-muted-foreground">
              Status breakdown:
            </span>
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-300">
              {summary.byStatus.PAID} Paid
            </Badge>
            <Badge className="bg-amber-100 text-amber-700 border-amber-300">
              {summary.byStatus.PARTIAL} Partial
            </Badge>
            <Badge className="bg-rose-100 text-rose-700 border-rose-300">
              {summary.byStatus.UNPAID} Unpaid
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={handlePrint}
              className="ml-auto"
            >
              <Printer className="w-4 h-4 mr-1" />
              Print / Save as PDF (A6)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Records table - both for screen and print */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[680px]">
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right no-print">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-5 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      No fee records match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {r.student?.name || "-"}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {r.student?.studentId || "-"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {r.student?.className || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {MONTHS[r.month - 1]} {r.year}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(r.totalPayable)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-emerald-700 font-medium">
                        {formatMoney(r.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-rose-700 font-medium">
                        {formatMoney(r.remainingBalance)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={STATUS_COLORS[r.status]}
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right no-print">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewStudent(r.studentId)}
                          title="View student payment history"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="hidden sm:inline ml-1">History</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Print version - A6 attractive layout (only visible when printing) */}
      <div className="hidden print:block print-area print-report report-a6">
        {/* School header */}
        <div className="flex items-center gap-2.5 border-b-2 border-primary pb-2 mb-2">
          <img
            src={SCHOOL.logo}
            alt="Logo"
            className="w-10 h-10 object-contain rounded-full bg-white shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-primary leading-tight">
              {SCHOOL.name}
            </h1>
            <p className="text-[8px] text-muted-foreground leading-tight">
              {SCHOOL.address}
            </p>
            <p className="text-[8px] font-semibold text-secondary-foreground">
              {SCHOOL.phones}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[7px] uppercase tracking-wide text-muted-foreground">
              Fee Report
            </p>
            <p className="text-[8px] font-semibold">
              {new Date().toLocaleDateString("en-GB")}
            </p>
          </div>
        </div>

        {/* Report title */}
        <h2 className="text-[10px] font-bold text-center mb-1.5 text-primary">
          {classFilter !== "ALL"
            ? `Class ${classFilter}`
            : "All Classes"}
          {monthFilter !== "ALL" &&
            ` · ${MONTHS[parseInt(monthFilter) - 1]}`}
          {yearFilter !== "ALL" && ` ${yearFilter}`}
        </h2>

        {/* Summary box */}
        {summary && (
          <div className="grid grid-cols-4 gap-1 mb-2 text-[8px]">
            <div className="border border-primary bg-primary/5 rounded p-1 text-center">
              <p className="text-muted-foreground">Records</p>
              <p className="font-bold text-[10px]">{summary.count}</p>
            </div>
            <div className="border border-secondary bg-secondary/10 rounded p-1 text-center">
              <p className="text-muted-foreground">Expected</p>
              <p className="font-bold text-[9px] text-secondary-foreground">
                {formatMoney(summary.totalExpected)}
              </p>
            </div>
            <div className="border border-emerald-600 bg-emerald-50 rounded p-1 text-center">
              <p className="text-muted-foreground">Collected</p>
              <p className="font-bold text-[9px] text-emerald-700">
                {formatMoney(summary.totalCollected)}
              </p>
            </div>
            <div className="border border-rose-600 bg-rose-50 rounded p-1 text-center">
              <p className="text-muted-foreground">Outstanding</p>
              <p className="font-bold text-[9px] text-rose-700">
                {formatMoney(summary.totalOutstanding)}
              </p>
            </div>
          </div>
        )}

        {/* Records table */}
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="text-left p-1 border border-primary text-[7px]">
                Student
              </th>
              <th className="text-left p-1 border border-primary text-[7px]">
                Class
              </th>
              <th className="text-left p-1 border border-primary text-[7px]">
                Month
              </th>
              <th className="text-right p-1 border border-primary text-[7px]">
                Total
              </th>
              <th className="text-right p-1 border border-primary text-[7px]">
                Paid
              </th>
              <th className="text-right p-1 border border-primary text-[7px]">
                Balance
              </th>
              <th className="text-center p-1 border border-primary text-[7px]">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id}>
                <td className="p-1 border border-border text-[7px]">
                  <div className="font-semibold">{r.student?.name || "-"}</div>
                  <div className="text-[6px] text-muted-foreground font-mono">
                    {r.student?.studentId}
                  </div>
                </td>
                <td className="p-1 border border-border text-[7px]">
                  {r.student?.className || "-"}
                </td>
                <td className="p-1 border border-border text-[7px]">
                  {MONTHS[r.month - 1].slice(0, 3)} {String(r.year).slice(2)}
                </td>
                <td className="p-1 border border-border text-[7px] text-right">
                  {r.totalPayable.toLocaleString("en-PK")}
                </td>
                <td className="p-1 border border-border text-[7px] text-right text-emerald-700 font-semibold">
                  {r.amountPaid.toLocaleString("en-PK")}
                </td>
                <td className="p-1 border border-border text-[7px] text-right text-rose-700 font-semibold">
                  {r.remainingBalance.toLocaleString("en-PK")}
                </td>
                <td className="p-1 border border-border text-[7px] text-center">
                  {r.status === "PAID"
                    ? "✓"
                    : r.status === "PARTIAL"
                    ? "◐"
                    : "✗"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="mt-2 flex items-center justify-between text-[7px] text-muted-foreground">
          <span>
            Legend: ✓ Paid · ◐ Partial · ✗ Unpaid
          </span>
          <span>
            Generated: {new Date().toLocaleString("en-GB")}
          </span>
        </div>
        <p className="mt-1 text-center text-[6px] text-muted-foreground">
          Computer-generated report · {SCHOOL.name}
        </p>
      </div>

      {/* Student detail dialog */}
      {studentDetail && (
        <StudentPaymentHistory
          detail={studentDetail}
          onClose={() => setStudentDetail(null)}
        />
      )}
      {loadingDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Skeleton className="h-40 w-80 rounded-lg" />
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${color}`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="text-lg font-bold truncate">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentPaymentHistory({
  detail,
  onClose,
}: {
  detail: StudentDetail;
  onClose: () => void;
}) {
  const s = detail.student;
  const records = s.feeRecords || [];
  const totalPaid = records.reduce((sum, r) => sum + r.amountPaid, 0);
  const totalDue = records.reduce((sum, r) => sum + r.remainingBalance, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 no-print">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="font-mono bg-primary text-primary-foreground">
                {s.studentId}
              </Badge>
              <h3 className="text-lg font-bold">{s.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {s.fatherName ? `S/O ${s.fatherName}` : ""}
              {s.className ? ` · Class: ${s.className}` : ""}
              {s.rollNumber ? ` · Roll: ${s.rollNumber}` : ""}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="text-lg font-bold">{records.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="text-lg font-bold text-emerald-700">
              {formatMoney(totalPaid)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="text-lg font-bold text-rose-700">
              {formatMoney(totalDue)}
            </p>
          </div>
        </div>
        <div className="overflow-y-auto p-4">
          {records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
              No fee records for this student yet.
            </div>
          ) : (
            <div className="space-y-4">
              {records.map((r) => (
                <div
                  key={r.id}
                  className="border rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <span className="font-semibold">
                        {MONTHS[r.month - 1]} {r.year}
                      </span>
                      <Badge
                        variant="outline"
                        className={`ml-2 ${STATUS_COLORS[r.status]}`}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        Total:{" "}
                        <span className="font-semibold">
                          {formatMoney(r.totalPayable)}
                        </span>
                      </span>
                      <span>
                        Paid:{" "}
                        <span className="font-semibold text-emerald-700">
                          {formatMoney(r.amountPaid)}
                        </span>
                      </span>
                      <span>
                        Due:{" "}
                        <span className="font-semibold text-rose-700">
                          {formatMoney(r.remainingBalance)}
                        </span>
                      </span>
                    </div>
                  </div>
                  {r.payments && r.payments.length > 0 ? (
                    <div className="border-t pt-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Payments:
                      </p>
                      <ul className="space-y-1 text-xs">
                        {r.payments.map((p) => (
                          <li
                            key={p.id}
                            className="flex justify-between gap-2"
                          >
                            <span className="font-mono text-primary">
                              {p.receiptNumber}
                            </span>
                            <span className="text-muted-foreground">
                              {formatDate(p.paymentDate)}
                            </span>
                            <span className="text-emerald-700 font-semibold">
                              {formatMoney(p.amountPaid)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground border-t pt-2">
                      No payments recorded.
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
