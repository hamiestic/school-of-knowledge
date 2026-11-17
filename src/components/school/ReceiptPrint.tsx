"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  FeePayment,
  formatMoney,
  formatDate,
  MONTHS,
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

  // While the receipt dialog is open, tag <body> so print CSS can isolate
  // the portal-rendered receipt (no dialog chrome, no blank pages).
  useEffect(() => {
    document.body.classList.add("printing-receipt");
    return () => document.body.classList.remove("printing-receipt");
  }, []);

  function handlePrint() {
    window.print();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fee Receipt Preview</DialogTitle>
            <DialogDescription>
              A6 portrait (105 × 148 mm) — print karte waqt paper size{" "}
              <strong>A6</strong> chuno, receipt exact fit hoga.
            </DialogDescription>
          </DialogHeader>

          {/* On-screen preview copy (never printed) */}
          <ReceiptCard record={record} payment={payment} printOnly={false} />

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

      {/* Print copy — portal at body level so it escapes the dialog and
          prints as a clean single A6 page */}
      {createPortal(
        <div className="print-only-root hidden print:block">
          <ReceiptCard record={record} payment={payment} printOnly={true} />
        </div>,
        document.body
      )}
    </>
  );
}

function ReceiptCard({
  record,
  payment,
  printOnly,
}: {
  record: FeeRecord;
  payment: FeePayment | null;
  printOnly: boolean;
}) {
  // Total paid before this payment (for "previously paid" line)
  const previouslyPaid =
    (record.payments || [])
      .filter((p) => p.id !== payment?.id)
      .reduce((s, p) => s + p.amountPaid, 0) || 0;

  const previousOutstanding = record.previousOutstanding;
  const totalPayable = record.totalPayable;
  const amountPaidNow = payment?.amountPaid || 0;
  const previouslyPaidPlusThis = previouslyPaid + amountPaidNow;
  const dueAmount = totalPayable - previouslyPaidPlusThis;
  const feeMonth = `${MONTHS[record.month - 1]} ${record.year}`;

  const statusChip =
    record.status === "PAID"
      ? "bg-emerald-600 text-white"
      : record.status === "PARTIAL"
      ? "bg-amber-500 text-white"
      : "bg-rose-600 text-white";

  return (
    <div
      className={`receipt-a6 print-receipt w-full max-w-[97mm] mx-auto rounded-xl border border-slate-300 bg-white overflow-hidden shadow-sm ${
        printOnly
          ? "print-area print:rounded-none print:border-0 print:shadow-none"
          : ""
      }`}
    >
      {/* ===== Colored header band ===== */}
      <div className="bg-gradient-to-r from-primary to-sky-500 text-white px-3 py-2.5 flex items-center gap-2.5">
        <img
          src={SCHOOL.logo}
          alt="Logo"
          className="w-9 h-9 object-contain rounded-full bg-white shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="text-[12px] font-extrabold leading-tight tracking-wide">
            {SCHOOL.name}
          </h1>
          <p className="text-[6.5px] text-white/90 leading-tight">
            {SCHOOL.address}
          </p>
          <p className="text-[6.5px] font-semibold text-white/95 leading-tight">
            Ph: {SCHOOL.phones}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[6.5px] uppercase tracking-[0.12em] text-white/80">
            Fee Receipt
          </p>
          <p className="text-[10px] font-mono font-bold bg-white/20 rounded-md px-1.5 py-0.5 mt-0.5">
            {payment?.receiptNumber || "—"}
          </p>
        </div>
      </div>

      {/* ===== Body ===== */}
      <div className="px-3 pt-2 pb-2.5">
        {/* Student info - compact two columns */}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0 text-[8px]">
          <InfoRow label="Student ID" value={record.student?.studentId || "-"} />
          <InfoRow
            label="Receipt Date"
            value={payment ? formatDate(payment.paymentDate) : "-"}
          />
          <InfoRow label="Name" value={record.student?.name || "-"} bold />
          <InfoRow label="Fee Month" value={feeMonth} bold />
          <InfoRow label="Father" value={record.student?.fatherName || "-"} />
          <InfoRow label="Class" value={record.student?.className || "-"} />
          <InfoRow label="Roll" value={record.student?.rollNumber || "-"} />
          <div className="flex items-center justify-between gap-1 border-b border-dotted border-slate-300 pb-0.5">
            <span className="text-slate-500 text-[7.5px]">Status:</span>
            <span
              className={`text-[7px] font-bold uppercase rounded px-1 py-[1px] ${statusChip}`}
            >
              {record.status}
            </span>
          </div>
        </div>

        {/* Fee categories table */}
        <table className="w-full border-collapse mt-1.5">
          <thead>
            <tr className="bg-primary text-primary-foreground">
              <th className="text-left px-1 py-[2px] border border-primary w-6 text-[8px] font-semibold">
                #
              </th>
              <th className="text-left px-1 py-[2px] border border-primary text-[8px] font-semibold">
                Description
              </th>
              <th className="text-right px-1 py-[2px] border border-primary w-16 text-[8px] font-semibold">
                Amount (Rs.)
              </th>
            </tr>
          </thead>
          <tbody>
            {record.categories && record.categories.length > 0 ? (
              record.categories.map((c, i) => (
                <tr key={c.id} className="even:bg-slate-50">
                  <td className="px-1 py-[2px] border border-slate-300 text-[8px] text-slate-600">
                    {i + 1}
                  </td>
                  <td className="px-1 py-[2px] border border-slate-300 text-[8px]">
                    {c.description}
                  </td>
                  <td className="px-1 py-[2px] border border-slate-300 text-[8px] text-right font-medium">
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
                  className="px-1 py-[3px] border border-slate-300 text-center text-slate-400 text-[8px]"
                >
                  No fee categories.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Totals box - Total Payable + Paid + Due */}
        <div className="mt-1.5 ml-auto w-[62%] rounded-md border border-slate-300 bg-slate-50 px-2 py-1.5 space-y-[3px] text-[8.5px]">
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
          <div className="border-t-2 border-slate-400 pt-[3px] mt-[2px]">
            <TotalRow
              label="Due Amount"
              value={formatMoney(Math.max(0, dueAmount))}
              bold
              red={dueAmount > 0}
              green={dueAmount <= 0}
            />
          </div>
        </div>

        {/* Remarks */}
        {payment?.remarks && (
          <div className="mt-1.5 text-[7.5px]">
            <span className="text-slate-500 font-semibold">Remarks: </span>
            <span className="italic">{payment.remarks}</span>
          </div>
        )}

        {/* Signatures */}
        <div className="mt-3.5 grid grid-cols-2 gap-5 text-[7.5px] text-slate-700">
          <div className="text-center">
            <div className="border-t border-slate-700 pt-0.5 font-medium">
              Received By
            </div>
          </div>
          <div className="text-center">
            <div className="border-t border-slate-700 pt-0.5 font-medium">
              Authorised Signature
            </div>
          </div>
        </div>

        <p className="mt-1.5 text-center text-[6.5px] text-slate-400">
          Computer-generated receipt · {SCHOOL.name} ·{" "}
          {new Date().toLocaleString("en-GB")}
        </p>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  return (
    <div className="flex justify-between gap-1 border-b border-dotted border-slate-300 pb-0.5">
      <span className="text-slate-500 text-[7.5px] shrink-0">{label}:</span>
      <span
        className={`text-right text-[8px] min-w-0 truncate ${
          bold ? "font-bold text-slate-900" : "font-medium text-slate-800"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
  highlight,
  red,
  green,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  highlight?: boolean;
  red?: boolean;
  green?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex justify-between items-center gap-1">
      <span
        className={`${
          muted ? "text-slate-500" : "text-slate-700"
        } ${bold ? "font-bold" : "font-medium"}`}
      >
        {label}
      </span>
      <span
        className={`${
          highlight
            ? "bg-emerald-600 text-white px-1.5 py-[1px] rounded font-bold text-[8px]"
            : red
            ? "text-rose-700 font-extrabold"
            : green
            ? "text-emerald-700 font-extrabold"
            : bold
            ? "font-extrabold text-primary"
            : "font-medium text-slate-700"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
