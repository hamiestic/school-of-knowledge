"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import {
  FeeRecord,
  formatMoney,
  formatDate,
  MONTHS,
  STATUS_COLORS,
  SCHOOL,
} from "@/lib/constants";

interface ReceiptPrintProps {
  record: FeeRecord;
  paymentId: string;
  onClose: () => void;
}

export function ReceiptPrint({ record, paymentId, onClose }: ReceiptPrintProps) {
  const [open, setOpen] = useState(true);
  const payment =
    record.payments?.find((x) => x.id === paymentId) || null;

  function handlePrint() {
    window.print();
  }

  // Total paid before this payment (for "previously paid" line)
  const previouslyPaid =
    (record.payments || [])
      .filter((p) => p.id !== paymentId)
      .reduce((s, p) => s + p.amountPaid, 0) || 0;

  const totalAmount = record.totalAmount;
  const previousOutstanding = record.previousOutstanding;
  const totalPayable = record.totalPayable;
  const amountPaidNow = payment?.amountPaid || 0;
  const previouslyPaidPlusThis = previouslyPaid + amountPaidNow;
  const remainingBalance = totalPayable - previouslyPaidPlusThis;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Fee Receipt Preview</DialogTitle>
          <DialogDescription>
            A6-size receipt (105 × 148 mm). Click &quot;Print / Save as PDF&quot;
            and choose A6 paper in the print dialog for a perfect fit.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-white">
          {/* Receipt content - A6 compact */}
          <div className="print-area print-receipt receipt-a6 p-4">
            {/* School header - compact */}
            <div className="flex items-center gap-2.5 border-b-2 border-primary pb-2">
              <img
                src={SCHOOL.logo}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-full bg-white shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h1 className="text-base font-bold text-primary leading-tight">
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
                  Receipt
                </p>
                <p className="text-[10px] font-mono font-bold text-primary">
                  {payment?.receiptNumber || "—"}
                </p>
              </div>
            </div>

            {/* Student info - compact two columns */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 py-2 text-[9px]">
              <InfoRow
                label="Student ID"
                value={record.student?.studentId || "-"}
              />
              <InfoRow
                label="Receipt Date"
                value={payment ? formatDate(payment.paymentDate) : "-"}
              />
              <InfoRow
                label="Name"
                value={record.student?.name || "-"}
              />
              <InfoRow
                label="Fee Month"
                value={`${MONTHS[record.month - 1]} ${record.year}`}
              />
              <InfoRow
                label="Father"
                value={record.student?.fatherName || "-"}
              />
              <InfoRow
                label="Class"
                value={record.student?.className || "-"}
              />
              <InfoRow
                label="Roll"
                value={record.student?.rollNumber || "-"}
              />
              <InfoRow
                label="Status"
                value={record.status}
              />
            </div>

            {/* Fee categories table - compact */}
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="text-left p-1 border border-primary text-[8px]">
                    #
                  </th>
                  <th className="text-left p-1 border border-primary text-[8px]">
                    Description
                  </th>
                  <th className="text-right p-1 border border-primary text-[8px]">
                    Rs.
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.categories && record.categories.length > 0 ? (
                  record.categories.map((c, i) => (
                    <tr key={c.id}>
                      <td className="p-1 border border-border text-[8px]">
                        {i + 1}
                      </td>
                      <td className="p-1 border border-border text-[8px]">
                        {c.description}
                      </td>
                      <td className="p-1 border border-border text-[8px] text-right font-medium">
                        {c.amount.toLocaleString("en-PK", {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-1 border border-border text-center text-muted-foreground text-[8px]"
                    >
                      No fee categories.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals - compact */}
            <div className="mt-1.5 ml-auto max-w-[60%] space-y-0.5 text-[9px]">
              <TotalRow
                label="Total Fee"
                value={formatMoney(totalAmount)}
              />
              {previousOutstanding > 0 && (
                <TotalRow
                  label="Prev. Outstanding"
                  value={formatMoney(previousOutstanding)}
                />
              )}
              <TotalRow
                label="Total Payable"
                value={formatMoney(totalPayable)}
                bold
              />
              {previouslyPaid > 0 && (
                <TotalRow
                  label="Previously Paid"
                  value={`- ${formatMoney(previouslyPaid)}`}
                  muted
                />
              )}
              <TotalRow
                label="Paid Now"
                value={formatMoney(amountPaidNow)}
                highlight
              />
              <div className="border-t border-primary pt-0.5 mt-0.5">
                <TotalRow
                  label="Balance"
                  value={formatMoney(remainingBalance)}
                  bold
                  red={remainingBalance > 0}
                />
              </div>
            </div>

            {/* Remarks */}
            {payment?.remarks && (
              <div className="mt-2 text-[8px]">
                <span className="text-muted-foreground">Remarks: </span>
                <span className="italic">{payment.remarks}</span>
              </div>
            )}

            {/* Signatures - compact */}
            <div className="mt-4 grid grid-cols-2 gap-4 text-[8px]">
              <div className="text-center">
                <div className="border-t border-foreground pt-0.5">
                  Received By
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-foreground pt-0.5">
                  Authorised Sign
                </div>
              </div>
            </div>

            <p className="mt-2 text-center text-[7px] text-muted-foreground">
              Computer-generated receipt · {SCHOOL.name}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onClose()}>
            <X className="w-4 h-4 mr-1" />
            Close
          </Button>
          <Button
            onClick={handlePrint}
            className="bg-primary hover:bg-primary/90"
          >
            <Printer className="w-4 h-4 mr-1" />
            Print / Save as PDF (A6)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-1 border-b border-dotted border-border pb-0.5">
      <span className="text-muted-foreground text-[8px]">{label}:</span>
      <span className="font-medium text-right text-[9px]">{value}</span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
  highlight,
  red,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  red?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span
        className={`${
          muted ? "text-muted-foreground" : "text-foreground"
        } ${bold ? "font-semibold" : ""}`}
      >
        {label}
      </span>
      <span
        className={`${
          highlight
            ? "bg-secondary text-secondary-foreground px-1.5 py-0 rounded font-bold text-[8px]"
            : red
            ? "text-rose-700 font-bold"
            : bold
            ? "font-bold text-primary"
            : "font-medium"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
