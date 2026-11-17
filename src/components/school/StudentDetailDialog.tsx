"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Student,
  FeeRecord,
  formatMoney,
  formatDate,
  MONTHS,
  STATUS_COLORS,
} from "@/lib/constants";

interface StudentDetailDialogProps {
  student: Student | null;
  onClose: () => void;
}

interface StudentWithRecords extends Student {
  feeRecords: FeeRecord[];
}

export function StudentDetailDialog({
  student,
  onClose,
}: StudentDetailDialogProps) {
  const [data, setData] = useState<StudentWithRecords | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!student) {
      return;
    }
    let cancelled = false;
    fetch(`/api/students/${student.id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d.student) {
          setData(d.student);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    // Schedule loading state via microtask to avoid synchronous setState in effect
    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setData(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [student]);

  if (!student) return null;

  const records = data?.feeRecords || [];
  const totalPaid = records.reduce((s, r) => s + r.amountPaid, 0);
  const totalDue = records.reduce((s, r) => s + r.remainingBalance, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="font-mono bg-primary text-primary-foreground">
                {student.studentId}
              </Badge>
              <h3 className="text-lg font-bold">{student.name}</h3>
              <Badge
                variant="outline"
                className={
                  student.status === "ACTIVE"
                    ? "bg-emerald-100 text-emerald-700 border-emerald-300"
                    : "bg-rose-100 text-rose-700 border-rose-300"
                }
              >
                {student.status}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {student.fatherName ? `S/O ${student.fatherName}` : "Father: -"}
              {student.className ? ` · Class: ${student.className}` : ""}
              {student.rollNumber ? ` · Roll: ${student.rollNumber}` : ""}
            </p>
            <p className="text-sm mt-1">
              <span className="text-muted-foreground">Fixed Monthly Fee: </span>
              <span className="font-semibold">
                {formatMoney(student.fixedMonthlyFee)}
              </span>
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="p-4 grid grid-cols-3 gap-3 border-b">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Fee Records</p>
            {loading ? (
              <Skeleton className="h-6 w-12 mx-auto" />
            ) : (
              <p className="text-lg font-bold">{records.length}</p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            {loading ? (
              <Skeleton className="h-6 w-20 mx-auto" />
            ) : (
              <p className="text-lg font-bold text-emerald-700">
                {formatMoney(totalPaid)}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            {loading ? (
              <Skeleton className="h-6 w-20 mx-auto" />
            ) : (
              <p className="text-lg font-bold text-rose-700">
                {formatMoney(totalDue)}
              </p>
            )}
          </div>
        </div>

        <div className="overflow-y-auto p-4">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No fee records for this student yet.
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div key={r.id} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">
                        {MONTHS[r.month - 1]} {r.year}
                      </span>
                      <Badge
                        variant="outline"
                        className={STATUS_COLORS[r.status]}
                      >
                        {r.status}
                      </Badge>
                    </div>
                    <div className="text-sm flex flex-wrap gap-x-3 gap-y-1">
                      <span>
                        <span className="text-muted-foreground">Total: </span>
                        <span className="font-semibold">
                          {formatMoney(r.totalPayable)}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Paid: </span>
                        <span className="font-semibold text-emerald-700">
                          {formatMoney(r.amountPaid)}
                        </span>
                      </span>
                      <span>
                        <span className="text-muted-foreground">Due: </span>
                        <span className="font-semibold text-rose-700">
                          {formatMoney(r.remainingBalance)}
                        </span>
                      </span>
                    </div>
                  </div>
                  {r.categories && r.categories.length > 0 && (
                    <div className="text-xs text-muted-foreground border-t pt-1.5">
                      {r.categories.map((c, i) => (
                        <span key={c.id}>
                          {i > 0 && " · "}
                          {c.description}:{" "}
                          <span className="font-medium text-foreground">
                            {formatMoney(c.amount)}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}
                  {r.payments && r.payments.length > 0 && (
                    <div className="border-t pt-2 mt-2">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Receipts:
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
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
