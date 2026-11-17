"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  Plus,
  Trash2,
  Save,
  Printer,
  Receipt as ReceiptIcon,
  Wallet,
  AlertCircle,
  ChevronRight,
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
  Student,
  FeeRecord,
  FeeCategory,
  formatMoney,
  formatDate,
  MONTHS,
  STATUS_COLORS,
  todayISO,
  getYearOptions,
} from "@/lib/constants";
import { toast } from "sonner";
import { ReceiptPrint } from "./ReceiptPrint";

interface FeeManagementViewProps {
  presetStudent: Student | null;
  clearPreset: () => void;
}

interface CategoryRow {
  description: string;
  amount: string;
}

export function FeeManagementView({
  presetStudent,
  clearPreset,
}: FeeManagementViewProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSort, setStudentSort] = useState("name-asc");
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [existingRecords, setExistingRecords] = useState<FeeRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [recordSort, setRecordSort] = useState("month-desc");

  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayISO());
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [paying, setPaying] = useState(false);

  // The fee record that was just saved/loaded - used for payments
  const [activeRecord, setActiveRecord] = useState<FeeRecord | null>(null);

  // For receipt printing
  const [printReceipt, setPrintReceipt] = useState<{
    record: FeeRecord;
    paymentId: string;
  } | null>(null);

  // Load default categories on mount
  useEffect(() => {
    fetch("/api/default-categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.categories && d.categories.length > 0) {
          setCategories(
            d.categories.map((c: FeeCategory) => ({
              description: c.description,
              amount: "",
            }))
          );
        } else {
          setCategories([
            { description: "Monthly Tuition Fee", amount: "" },
            { description: "Books", amount: "" },
            { description: "Uniform", amount: "" },
            { description: "Others", amount: "" },
          ]);
        }
      })
      .catch(() => {
        setCategories([
          { description: "Monthly Tuition Fee", amount: "" },
          { description: "Books", amount: "" },
          { description: "Uniform", amount: "" },
          { description: "Others", amount: "" },
        ]);
      });
  }, []);

  const loadStudents = useCallback(() => {
    setLoadingStudents(true);
    const params = new URLSearchParams();
    if (studentSearch) params.set("search", studentSearch);
    params.set("status", "ACTIVE");
    params.set("sort", studentSort);
    fetch(`/api/students?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.students && setStudents(d.students))
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoadingStudents(false));
  }, [studentSearch, studentSort]);

  useEffect(() => {
    const t = setTimeout(loadStudents, 250);
    return () => clearTimeout(t);
  }, [loadStudents]);

  // Apply preset student from outside (e.g., clicked "Collect Fee" on a row)
  useEffect(() => {
    if (presetStudent) {
      setSelectedStudent(presetStudent);
      clearPreset();
    }
  }, [presetStudent, clearPreset]);

  // Load existing fee records for selected student
  useEffect(() => {
    if (!selectedStudent) {
      setExistingRecords([]);
      setActiveRecord(null);
      return;
    }
    setLoadingRecords(true);
    fetch(`/api/students/${selectedStudent.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.student) {
          setExistingRecords(d.student.feeRecords || []);
          // Find current month/year record
          const match = (d.student.feeRecords || []).find(
            (r: FeeRecord) => r.month === month && r.year === year
          );
          if (match) {
            setActiveRecord(match);
            setCategories(
              match.categories && match.categories.length > 0
                ? match.categories.map((c) => ({
                    description: c.description,
                    amount: String(c.amount),
                  }))
                : [{ description: "Monthly Tuition Fee", amount: "" }]
            );
            setRemarks(match.remarks || "");
          } else {
            setActiveRecord(null);
            // Pre-fill tuition fee from student's fixedMonthlyFee
            setCategories((prev) => {
              const next = [...prev];
              const tuitionIdx = next.findIndex((c) =>
                c.description.toLowerCase().includes("tuition")
              );
              if (tuitionIdx >= 0) {
                next[tuitionIdx] = {
                  ...next[tuitionIdx],
                  amount:
                    selectedStudent.fixedMonthlyFee > 0
                      ? String(selectedStudent.fixedMonthlyFee)
                      : "",
                };
              }
              return next;
            });
            setRemarks("");
          }
        }
      })
      .catch(() => toast.error("Failed to load student records."))
      .finally(() => setLoadingRecords(false));
  }, [selectedStudent, month, year]);

  // Auto-calculations
  const totalAmount = useMemo(
    () =>
      categories.reduce(
        (s, c) => s + (parseFloat(c.amount) || 0),
        0
      ),
    [categories]
  );
  const previousOutstanding = activeRecord?.previousOutstanding ?? 0;
  const totalPayable = totalAmount + previousOutstanding;
  const amountPaid = activeRecord?.amountPaid ?? 0;
  const remainingBalance = totalPayable - amountPaid;

  // Suggested payment = remaining balance
  useEffect(() => {
    if (activeRecord && remainingBalance > 0) {
      setPaymentAmount(String(remainingBalance.toFixed(2)));
    } else if (!activeRecord && totalPayable > 0) {
      setPaymentAmount(String(totalPayable.toFixed(2)));
    } else {
      setPaymentAmount("");
    }
  }, [activeRecord?.id, totalPayable, remainingBalance]);

  function addCategory() {
    setCategories([...categories, { description: "", amount: "" }]);
  }
  function removeCategory(idx: number) {
    setCategories(categories.filter((_, i) => i !== idx));
  }
  function updateCategory(idx: number, field: keyof CategoryRow, value: string) {
    setCategories(
      categories.map((c, i) =>
        i === idx ? { ...c, [field]: value } : c
      )
    );
  }

  async function saveFeeRecord() {
    if (!selectedStudent) {
      toast.error("Please select a student first.");
      return;
    }
    const cleanCats = categories
      .map((c) => ({
        description: c.description.trim(),
        amount: parseFloat(c.amount) || 0,
      }))
      .filter((c) => c.description);
    if (cleanCats.length === 0) {
      toast.error("Add at least one fee category with a description.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          month,
          year,
          categories: cleanCats,
          remarks: remarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed.");
        return;
      }
      toast.success(
        `Fee record for ${MONTHS[month - 1]} ${year} saved successfully.`
      );
      setActiveRecord(data.feeRecord);
      // Reload student records
      const sr = await fetch(`/api/students/${selectedStudent.id}`, {
        cache: "no-store",
      }).then((r) => r.json());
      if (sr.student) setExistingRecords(sr.student.feeRecords || []);
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function collectPayment() {
    if (!activeRecord) {
      toast.error("Save the fee record first before collecting payment.");
      return;
    }
    const amt = parseFloat(paymentAmount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Enter a valid payment amount.");
      return;
    }
    setPaying(true);
    try {
      const res = await fetch(`/api/fees/${activeRecord.id}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountPaid: amt,
          paymentDate,
          remarks: paymentRemarks.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Payment failed.");
        return;
      }
      toast.success(
        `Payment recorded. Receipt ${data.receiptNumber} generated.`
      );
      setActiveRecord(data.feeRecord);
      setPaymentRemarks("");
      // Reload student records
      const sr = await fetch(`/api/students/${selectedStudent.id}`, {
        cache: "no-store",
      }).then((r) => r.json());
      if (sr.student) setExistingRecords(sr.student.feeRecords || []);
      // Auto-open print preview
      setPrintReceipt({
        record: data.feeRecord,
        paymentId: data.payment.id,
      });
    } catch {
      toast.error("Network error.");
    } finally {
      setPaying(false);
    }
  }

  async function reversePayment(paymentId: string, receiptNumber: string) {
    if (!confirm(`Reverse payment ${receiptNumber}? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success(data.message);
      if (activeRecord) {
        const rr = await fetch(`/api/fees/${activeRecord.id}`, {
          cache: "no-store",
        }).then((r) => r.json());
        if (rr.feeRecord) setActiveRecord(rr.feeRecord);
      }
      if (selectedStudent) {
        const sr = await fetch(`/api/students/${selectedStudent.id}`, {
          cache: "no-store",
        }).then((r) => r.json());
        if (sr.student) setExistingRecords(sr.student.feeRecords || []);
      }
    } catch {
      toast.error("Network error.");
    }
  }

  const yearOptions = useMemo(() => getYearOptions(), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Fee Management</h2>
        <p className="text-sm text-muted-foreground">
          Select a student, create or load a monthly fee record, then collect
          payments.
        </p>
      </div>

      {/* Student selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1 — Select Student</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="Search students by name, ID, or father's name..."
                className="pl-9"
              />
            </div>
            <Select value={studentSort} onValueChange={setStudentSort}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                <SelectItem value="id-asc">Student ID (Low-High)</SelectItem>
                <SelectItem value="id-desc">Student ID (High-Low)</SelectItem>
                <SelectItem value="class-asc">Class (A-Z)</SelectItem>
                <SelectItem value="roll-asc">Roll Number</SelectItem>
                <SelectItem value="fee-desc">Fee (High-Low)</SelectItem>
                <SelectItem value="fee-asc">Fee (Low-High)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {selectedStudent ? (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="font-mono bg-primary text-primary-foreground">
                      {selectedStudent.studentId}
                    </Badge>
                    <h3 className="text-lg font-bold">
                      {selectedStudent.name}
                    </h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedStudent.fatherName
                      ? `S/O ${selectedStudent.fatherName}`
                      : "Father's name not provided"}{" "}
                    &middot; Class:{" "}
                    {selectedStudent.className || "Unassigned"} &middot; Roll:{" "}
                    {selectedStudent.rollNumber || "-"}
                  </p>
                  <p className="text-sm mt-1">
                    <span className="text-muted-foreground">
                      Fixed Monthly Fee:{" "}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(selectedStudent.fixedMonthlyFee)}
                    </span>
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(null);
                    setActiveRecord(null);
                  }}
                >
                  Change Student
                </Button>
              </div>
            </div>
          ) : loadingStudents ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : students.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No active students found. Add students first.
            </p>
          ) : (
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <Table>
                <TableBody>
                  {students.slice(0, 50).map((s) => (
                    <TableRow
                      key={s.id}
                      className="cursor-pointer hover:bg-primary/5"
                      onClick={() => setSelectedStudent(s)}
                    >
                      <TableCell className="font-mono text-xs text-primary w-28">
                        {s.studentId}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {s.className || "-"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {formatMoney(s.fixedMonthlyFee)}
                      </TableCell>
                      <TableCell className="w-8">
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {students.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-2 border-t">
                  Showing first 50 matches. Refine your search to narrow down.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedStudent && (
        <>
          {/* Fee record form */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg">
                  Step 2 — Fee Record for {MONTHS[month - 1]} {year}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeRecord
                    ? "Existing record loaded. Categories are editable."
                    : "Create a new monthly fee record."}
                </p>
              </div>
              <div className="flex gap-2">
                <Select
                  value={String(month)}
                  onValueChange={(v) => setMonth(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={String(year)}
                  onValueChange={(v) => setYear(parseInt(v, 10))}
                >
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold">
                    Fee Categories
                  </Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addCategory}
                    type="button"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Custom Charge
                  </Button>
                </div>
                <div className="space-y-2">
                  {categories.map((c, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-12 gap-2 items-center"
                    >
                      <Input
                        value={c.description}
                        onChange={(e) =>
                          updateCategory(idx, "description", e.target.value)
                        }
                        placeholder="Fee description (e.g. Monthly Tuition Fee, Books, Uniform, Exam Fee...)"
                        className="col-span-7"
                      />
                      <div className="col-span-4 relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          Rs.
                        </span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={c.amount}
                          onChange={(e) =>
                            updateCategory(idx, "amount", e.target.value)
                          }
                          placeholder="0"
                          className="pl-9 text-right"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCategory(idx)}
                        type="button"
                        className="col-span-1 text-rose-600 hover:bg-rose-50"
                        disabled={categories.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="remarks">Remarks (optional)</Label>
                <Input
                  id="remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Any note about this fee record"
                />
              </div>

              {/* Calculations summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-muted/40 p-4">
                <CalcBox
                  label="Total Fee Amount"
                  value={formatMoney(totalAmount)}
                />
                <CalcBox
                  label="Previous Outstanding"
                  value={formatMoney(previousOutstanding)}
                  hint="Carried from previous month"
                />
                <CalcBox
                  label="Total Payable"
                  value={formatMoney(totalPayable)}
                  highlight
                />
                <CalcBox
                  label="Already Paid"
                  value={formatMoney(amountPaid)}
                />
              </div>

              <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                {activeRecord && (
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={STATUS_COLORS[activeRecord.status]}
                    >
                      {activeRecord.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Balance:{" "}
                      <span className="font-semibold text-foreground">
                        {formatMoney(remainingBalance)}
                      </span>
                    </span>
                  </div>
                )}
                <Button
                  onClick={saveFeeRecord}
                  disabled={saving}
                  className="bg-primary hover:bg-primary/90 ml-auto"
                >
                  <Save className="w-4 h-4 mr-1" />
                  {saving
                    ? "Saving..."
                    : activeRecord
                    ? "Update Fee Record"
                    : "Save Fee Record"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Payment collection */}
          {activeRecord && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Step 3 — Collect Payment &amp; Generate Receipt
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Multiple payments can be collected against this record. Each
                  payment generates a unique receipt.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="pamount">Amount Paid (Rs.)</Label>
                    <Input
                      id="pamount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="pdate">Payment Date</Label>
                    <Input
                      id="pdate"
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="premarks">Remarks (optional)</Label>
                    <Input
                      id="premarks"
                      value={paymentRemarks}
                      onChange={(e) => setPaymentRemarks(e.target.value)}
                      placeholder="Note about this payment"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="text-sm">
                    <span className="text-muted-foreground">
                      Remaining balance after this payment:{" "}
                    </span>
                    <span className="font-semibold">
                      {formatMoney(
                        Math.max(
                          0,
                          totalPayable -
                            amountPaid -
                            (parseFloat(paymentAmount) || 0)
                        )
                      )}
                    </span>
                  </div>
                  <Button
                    onClick={collectPayment}
                    disabled={paying}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Wallet className="w-4 h-4 mr-1" />
                    {paying ? "Processing..." : "Save Payment & Generate Receipt"}
                  </Button>
                </div>

                {/* Existing payments */}
                {activeRecord.payments && activeRecord.payments.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">
                      Payment History for this Month
                    </Label>
                    <div className="border rounded-lg overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/40">
                            <TableHead>Receipt #</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {activeRecord.payments.map((p) => (
                            <TableRow key={p.id}>
                              <TableCell className="font-mono text-xs font-semibold text-primary">
                                {p.receiptNumber}
                              </TableCell>
                              <TableCell className="text-right font-semibold text-emerald-700">
                                {formatMoney(p.amountPaid)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {formatDate(p.paymentDate)}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {p.remarks || "-"}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      setPrintReceipt({
                                        record: activeRecord,
                                        paymentId: p.id,
                                      })
                                    }
                                    title="Print receipt"
                                  >
                                    <Printer className="w-4 h-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      reversePayment(p.id, p.receiptNumber)
                                    }
                                    title="Reverse payment"
                                    className="text-rose-600 hover:bg-rose-50"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Student's all fee records */}
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 flex-wrap gap-2">
              <CardTitle className="text-lg">
                All Fee Records for {selectedStudent.name}
              </CardTitle>
              <Select value={recordSort} onValueChange={setRecordSort}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month-desc">Month (Newest)</SelectItem>
                  <SelectItem value="month-asc">Month (Oldest)</SelectItem>
                  <SelectItem value="total-desc">Total (High-Low)</SelectItem>
                  <SelectItem value="paid-desc">Paid (High-Low)</SelectItem>
                  <SelectItem value="balance-desc">Balance (High-Low)</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {loadingRecords ? (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : existingRecords.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No fee records yet for this student.
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40">
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Paid</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...existingRecords].sort((a, b) => {
                        switch (recordSort) {
                          case "month-asc":
                            return a.year !== b.year ? a.year - b.year : a.month - b.month;
                          case "month-desc":
                            return a.year !== b.year ? b.year - a.year : b.month - a.month;
                          case "total-desc":
                            return b.totalPayable - a.totalPayable;
                          case "paid-desc":
                            return b.amountPaid - a.amountPaid;
                          case "balance-desc":
                            return b.remainingBalance - a.remainingBalance;
                          case "status":
                            return a.status.localeCompare(b.status);
                          default:
                            return 0;
                        }
                      }).map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">
                            {MONTHS[r.month - 1]} {r.year}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatMoney(r.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right text-emerald-700">
                            {formatMoney(r.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right text-rose-700">
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
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setMonth(r.month);
                                setYear(r.year);
                                setActiveRecord(r);
                                setCategories(
                                  r.categories && r.categories.length > 0
                                    ? r.categories.map((c) => ({
                                        description: c.description,
                                        amount: String(c.amount),
                                      }))
                                    : [
                                        {
                                          description: "Monthly Tuition Fee",
                                          amount: "",
                                        },
                                      ]
                                );
                                setRemarks(r.remarks || "");
                              }}
                            >
                              Load
                              <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* Receipt print dialog */}
      {printReceipt && (
        <ReceiptPrint
          record={printReceipt.record}
          paymentId={printReceipt.paymentId}
          onClose={() => setPrintReceipt(null)}
        />
      )}
    </div>
  );
}

function CalcBox({
  label,
  value,
  highlight,
  hint,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  hint?: string;
}) {
  return (
    <div
      className={`rounded-lg p-3 ${
        highlight ? "bg-primary text-primary-foreground" : "bg-background"
      }`}
    >
      <p
        className={`text-xs ${
          highlight ? "text-primary-foreground/80" : "text-muted-foreground"
        }`}
      >
        {label}
      </p>
      <p
        className={`text-lg font-bold mt-0.5 ${
          highlight ? "" : "text-foreground"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p
          className={`text-[10px] mt-0.5 ${
            highlight ? "text-primary-foreground/70" : "text-muted-foreground"
          }`}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
