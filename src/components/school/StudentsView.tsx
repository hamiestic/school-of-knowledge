"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  UserCheck,
  UserX,
  Receipt,
  Eye,
  Filter,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Student, formatMoney, MONTHS, CLASS_ORDER } from "@/lib/constants";
import { toast } from "sonner";

interface StudentsViewProps {
  onCollectFee: (student: Student) => void;
  onViewStudent: (student: Student) => void;
  presetStudentId?: string | null;
  clearPreset?: () => void;
}

export function StudentsView({
  onCollectFee,
  onViewStudent,
  presetStudentId,
  clearPreset,
}: StudentsViewProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("date-desc");
  const [classes, setClasses] = useState<string[]>([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [form, setForm] = useState({
    studentIdNumber: "",
    name: "",
    fatherName: "",
    className: "",
    rollNumber: "",
    fixedMonthlyFee: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete confirmation dialog state
  const [deleteTarget, setDeleteTarget] = useState<Student | null>(null);
  const [deleteInfo, setDeleteInfo] = useState<{
    feeCount: number;
    outstanding: number;
    loading: boolean;
  }>({ feeCount: 0, outstanding: 0, loading: false });
  const [deleting, setDeleting] = useState(false);

  const loadClasses = useCallback(() => {
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
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    params.set("sort", sortBy);
    fetch(`/api/students?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.students) {
          setStudents(d.students);
          setTotal(d.total);
        }
      })
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoading(false));
  }, [search, classFilter, statusFilter, sortBy]);

  useEffect(() => {
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  // Open dialog with preset student (e.g., "Add New Student" from dashboard)
  useEffect(() => {
    if (presetStudentId === "NEW") {
      openAdd();
      clearPreset?.();
    }
  }, [presetStudentId, clearPreset]);

  function openAdd() {
    setEditing(null);
    setForm({
      studentIdNumber: "",
      name: "",
      fatherName: "",
      className: "",
      rollNumber: "",
      fixedMonthlyFee: "",
    });
    setDialogOpen(true);
  }

  function openEdit(s: Student) {
    setEditing(s);
    // Extract the number part from student ID (remove "SK-" prefix)
    const idNumber = s.studentId.startsWith("SK-")
      ? s.studentId.substring(3)
      : s.studentId;
    setForm({
      studentIdNumber: idNumber,
      name: s.name,
      fatherName: s.fatherName || "",
      className: s.className || "",
      rollNumber: s.rollNumber || "",
      fixedMonthlyFee:
        s.fixedMonthlyFee > 0 ? String(s.fixedMonthlyFee) : "",
    });
    setDialogOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Student Name is required.");
      return;
    }
    if (!form.className) {
      toast.error("Class is required. Please select a class.");
      return;
    }
    if (!form.studentIdNumber.trim()) {
      toast.error("Student ID Number is required. Enter a number after SK-.");
      return;
    }
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        studentIdNumber: form.studentIdNumber.trim(),
        fatherName: form.fatherName.trim() || null,
        className: form.className.trim(),
        rollNumber: form.rollNumber.trim() || null,
        fixedMonthlyFee: form.fixedMonthlyFee
          ? parseFloat(form.fixedMonthlyFee)
          : 0,
      };
      const url = editing
        ? `/api/students/${editing.id}`
        : "/api/students";
      const method = editing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Save failed.");
        return;
      }
      toast.success(
        editing
          ? "Student updated successfully."
          : `Student created with ID ${data.student.studentId}.`
      );
      setDialogOpen(false);
      load();
      loadClasses();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(s: Student) {
    const newStatus = s.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/students/${s.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success(
        newStatus === "ACTIVE"
          ? "Student marked Active."
          : "Student marked Inactive. Records preserved."
      );
      load();
    } catch {
      toast.error("Network error.");
    }
  }

  // Open delete confirmation dialog - fetches fee record count AND outstanding balance
  async function deleteStudent(s: Student) {
    setDeleteTarget(s);
    setDeleteInfo({ feeCount: 0, outstanding: 0, loading: true });
    try {
      const res = await fetch(`/api/students/${s.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (data.student) {
        const feeRecords = data.student.feeRecords || [];
        const feeCount = feeRecords.length;
        const outstanding = feeRecords.reduce(
          (sum: number, r: { remainingBalance?: number }) =>
            sum + (r.remainingBalance || 0),
          0
        );
        setDeleteInfo({ feeCount, outstanding, loading: false });
      } else {
        setDeleteInfo({ feeCount: 0, outstanding: 0, loading: false });
      }
    } catch {
      setDeleteInfo({ feeCount: 0, outstanding: 0, loading: false });
    }
  }

  // Actually perform the delete after confirmation
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success(data.message);
      setDeleteTarget(null);
      load();
      loadClasses();
    } catch {
      toast.error("Network error.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Students</h2>
          <p className="text-sm text-muted-foreground">
            {total} registered · add, edit, search, and filter
          </p>
        </div>
        <Button onClick={openAdd} className="bg-primary hover:bg-primary/90">
          <Plus className="w-4 h-4 mr-1" />
          Add New Student
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Search &amp; Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Name, Student ID, Father's name..."
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Class</Label>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
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
                  <SelectItem value="date-desc">Newest First</SelectItem>
                  <SelectItem value="date-asc">Oldest First</SelectItem>
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="w-28">Student ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Father&apos;s Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead className="text-right">Fixed Fee</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="text-center py-12 text-muted-foreground"
                    >
                      <Filter className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
                      No students found. Click &quot;Add New Student&quot; to
                      get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-xs font-semibold text-primary">
                        {s.studentId}
                      </TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {s.fatherName || "-"}
                      </TableCell>
                      <TableCell>{s.className || "-"}</TableCell>
                      <TableCell>{s.rollNumber || "-"}</TableCell>
                      <TableCell className="text-right">
                        {s.fixedMonthlyFee > 0
                          ? formatMoney(s.fixedMonthlyFee)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={
                            s.status === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                              : "bg-rose-100 text-rose-700 border-rose-300"
                          }
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewStudent(s)}
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onCollectFee(s)}
                            title="Collect fee"
                            disabled={s.status !== "ACTIVE"}
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(s)}
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleStatus(s)}
                            title={
                              s.status === "ACTIVE"
                                ? "Mark Inactive"
                                : "Mark Active"
                            }
                          >
                            {s.status === "ACTIVE" ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteStudent(s)}
                            title={
                              s.status === "ACTIVE"
                                ? "Deactivate (preserve records)"
                                : "Delete permanently (if no fee records)"
                            }
                            className="text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Student" : "Add New Student"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? `Editing ${editing.name} — update any field below.`
                : "Student ID, Name, and Class are required. Others are optional."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-4">
            {/* Student ID Number - manual entry with SK- prefix */}
            <div className="space-y-1.5">
              <Label htmlFor="studentIdNumber">
                Student ID <span className="text-rose-600">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-2 rounded-md border border-primary/20">
                  SK-
                </span>
                <Input
                  id="studentIdNumber"
                  value={form.studentIdNumber}
                  onChange={(e) =>
                    setForm({ ...form, studentIdNumber: e.target.value })
                  }
                  placeholder="Enter number (e.g. 001, 100)"
                  required
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Enter a unique number. Full ID will be{" "}
                <span className="font-mono font-semibold text-primary">
                  SK-{form.studentIdNumber || "?"}
                </span>
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name">
                Student Name <span className="text-rose-600">*</span>
              </Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                placeholder="Full name"
                required
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="fatherName">Father&apos;s Name</Label>
                <Input
                  id="fatherName"
                  value={form.fatherName}
                  onChange={(e) =>
                    setForm({ ...form, fatherName: e.target.value })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="className">
                  Class <span className="text-rose-600">*</span>
                </Label>
                <Select
                  value={form.className}
                  onValueChange={(v) =>
                    setForm({ ...form, className: v })
                  }
                >
                  <SelectTrigger id="className">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {CLASS_ORDER.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rollNumber">Roll Number</Label>
                <Input
                  id="rollNumber"
                  value={form.rollNumber}
                  onChange={(e) =>
                    setForm({ ...form, rollNumber: e.target.value })
                  }
                  placeholder="Unique per class"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="fee">Fixed Monthly Fee (Rs.)</Label>
                <Input
                  id="fee"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.fixedMonthlyFee}
                  onChange={(e) =>
                    setForm({ ...form, fixedMonthlyFee: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-primary hover:bg-primary/90"
              >
                {saving ? "Saving..." : editing ? "Update Student" : "Save Student"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              Confirm Delete Student
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to delete{" "}
                  <strong className="text-foreground">
                    {deleteTarget?.name}
                  </strong>{" "}
                  (ID:{" "}
                  <span className="font-mono text-primary">
                    {deleteTarget?.studentId}
                  </span>
                  )
                  {deleteTarget?.className &&
                    `, Class: ${deleteTarget.className}`}
                  .
                </p>
                {deleteInfo.loading ? (
                  <p className="text-muted-foreground text-sm">
                    Checking fee records and outstanding dues...
                  </p>
                ) : deleteInfo.outstanding > 0 ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-amber-800">
                      ⚠ Warning: This student has unpaid dues of Rs.{" "}
                      {deleteInfo.outstanding.toLocaleString()}!
                    </p>
                    <p className="text-xs text-amber-700">
                      The student has {deleteInfo.feeCount} fee record(s) with
                      outstanding balance. The student will be marked as{" "}
                      <strong>INACTIVE</strong> to preserve all fee records and
                      receipts. You cannot permanently delete a student with
                      unpaid dues. Please collect all outstanding fees first.
                    </p>
                  </div>
                ) : deleteInfo.feeCount > 0 ? (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-rose-800">
                      This student has {deleteInfo.feeCount} fee record(s) but
                      all dues are cleared (Rs. 0 outstanding).
                    </p>
                    <p className="text-xs text-rose-700">
                      The student will be{" "}
                      <strong>permanently deleted</strong> from the database
                      along with their paid fee records. This action cannot be
                      undone.
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 space-y-2">
                    <p className="text-sm font-semibold text-rose-800">
                      This student has no fee records.
                    </p>
                    <p className="text-xs text-rose-700">
                      The student will be{" "}
                      <strong>permanently deleted</strong> from the database.
                      This action cannot be undone.
                    </p>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Are you absolutely sure you want to proceed?
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={deleting || deleteInfo.loading}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {deleting
                ? "Deleting..."
                : deleteInfo.outstanding > 0
                ? "Mark as Inactive"
                : "Yes, Delete Permanently"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Months re-export to keep bundler happy with build-time constants
export { MONTHS };
