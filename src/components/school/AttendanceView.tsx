"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Printer,
  Sun,
  CheckSquare,
  Square,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Student,
  MONTHS,
  SCHOOL,
  daysInMonth,
  HOLIDAY_LABELS,
  sortClassesByOrder,
  getYearOptions,
} from "@/lib/constants";
import { toast } from "sonner";

interface Holiday {
  id: string;
  date: string;
  label: string;
}

// Holiday label colors for the calendar
const HOLIDAY_COLORS: Record<string, string> = {
  Sunday: "bg-secondary/30 text-secondary-foreground border-secondary",
  "School Holiday": "bg-rose-100 text-rose-700 border-rose-400",
  "Public Holiday": "bg-purple-100 text-purple-700 border-purple-400",
  "Custom Holiday": "bg-amber-100 text-amber-700 border-amber-400",
};

const HOLIDAY_SHORT: Record<string, string> = {
  Sunday: "SUN",
  "School Holiday": "SCH",
  "Public Holiday": "PUB",
  "Custom Holiday": "CST",
};

// Holiday cycle order for clicking
const HOLIDAY_CYCLE = ["School Holiday", "Public Holiday", "Custom Holiday"];

export function AttendanceView() {
  const [classes, setClasses] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [teacherName, setTeacherName] = useState("");
  const [includeSundays, setIncludeSundays] = useState(true);

  const [studentsByClass, setStudentsByClass] = useState<
    Record<string, Student[]>
  >({});
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Holidays: loaded from DB, editable in calendar
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  // Draft: { dateStr: { label: string } } - label can be a holiday type or "__REMOVE__"
  const [holidayDraft, setHolidayDraft] = useState<
    Record<string, { label: string }>
  >({});
  const [savingHolidays, setSavingHolidays] = useState(false);
  const [generated, setGenerated] = useState(false);

  const yearOptions = useMemo(() => getYearOptions(), []);

  const days = useMemo(() => daysInMonth(month, year), [month, year]);

  // Load classes
  useEffect(() => {
    fetch("/api/classes", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.classes && setClasses(d.classes))
      .catch(() => {});
  }, []);

  // Load holidays for the selected month/year
  const loadHolidays = useCallback(() => {
    const params = new URLSearchParams({
      month: String(month),
      year: String(year),
    });
    fetch(`/api/holidays?${params.toString()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setHolidays(d.holidays || []))
      .catch(() => {});
  }, [month, year]);

  useEffect(() => {
    loadHolidays();
    setHolidayDraft({});
  }, [loadHolidays]);

  // Compute the calendar grid for the month
  const calendar = useMemo(() => {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const totalDays = days;
    const cells: Array<{
      day: number | null;
      dateStr: string | null;
      isSunday: boolean;
    }> = [];
    for (let i = 0; i < firstDay; i++) {
      cells.push({ day: null, dateStr: null, isSunday: false });
    }
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dt = new Date(year, month - 1, d);
      cells.push({
        day: d,
        dateStr,
        isSunday: dt.getDay() === 0,
      });
    }
    return cells;
  }, [month, year, days]);

  // Get holiday info for a date - check draft FIRST, then DB, then auto-Sunday
  function getHolidayInfo(dateStr: string | null, isSunday: boolean) {
    if (!dateStr) return null;

    // 1. Check draft (user's pending changes) FIRST - this allows overriding auto-Sunday
    const draftLabel = holidayDraft[dateStr]?.label;
    if (draftLabel && draftLabel !== "__REMOVE__") {
      return { label: draftLabel, source: "draft" as const };
    }
    if (draftLabel === "__REMOVE__") {
      return null; // Explicitly removed by user
    }

    // 2. Check DB (saved holidays)
    const dbHoliday = holidays.find((h) => h.date === dateStr);
    if (dbHoliday) {
      // If this is a "Sunday" labeled holiday in the DB and the Sunday toggle
      // is OFF, treat it as non-holiday (the toggle controls all Sundays)
      if (dbHoliday.label === "Sunday" && !includeSundays) {
        // Skip - Sunday toggle is off, so DB Sundays are ignored
      } else {
        return { label: dbHoliday.label, source: "db" as const };
      }
    }

    // 3. Auto-Sunday (only if toggle is on and no draft override)
    if (isSunday && includeSundays) {
      return { label: "Sunday", source: "auto" as const };
    }

    return null;
  }

  // Click to cycle through holiday types:
  // None/Sunday → SCH → PUB → CST → None (removed)
  // IMPORTANT: When cycling to None, use "__REMOVE__" instead of deleting the draft entry.
  // This is because if a holiday was saved to the DB, deleting the draft entry would
  // cause the DB holiday to resurface. Using "__REMOVE__" ensures the DB holiday is
  // also removed when saved.
  function toggleHoliday(dateStr: string, isSunday: boolean) {
    const current = getHolidayInfo(dateStr, isSunday);

    if (!current || current.label === "Sunday") {
      // None or Auto-Sunday → first custom type (School Holiday)
      setHolidayDraft((prev) => ({
        ...prev,
        [dateStr]: { label: HOLIDAY_CYCLE[0] },
      }));
    } else {
      const currentIdx = HOLIDAY_CYCLE.indexOf(current.label);
      if (currentIdx >= 0 && currentIdx < HOLIDAY_CYCLE.length - 1) {
        // SCH → PUB, PUB → CST
        setHolidayDraft((prev) => ({
          ...prev,
          [dateStr]: { label: HOLIDAY_CYCLE[currentIdx + 1] },
        }));
      } else {
        // CST → None (use __REMOVE__ to override any DB holiday)
        setHolidayDraft((prev) => ({
          ...prev,
          [dateStr]: { label: "__REMOVE__" },
        }));
      }
    }
  }

  // Build the final holiday list (combining DB + draft + auto Sundays)
  function buildFinalHolidays(): Array<{ date: string; label: string }> {
    const result: Array<{ date: string; label: string }> = [];
    for (let d = 1; d <= days; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dt = new Date(year, month - 1, d);
      const isSunday = dt.getDay() === 0;
      const info = getHolidayInfo(dateStr, isSunday);
      if (info) {
        result.push({ date: dateStr, label: info.label });
      }
    }
    return result;
  }

  const finalHolidays = useMemo(() => buildFinalHolidays(), [
    holidays,
    holidayDraft,
    includeSundays,
    month,
    year,
    days,
  ]);

  const hasUnsavedChanges = Object.keys(holidayDraft).length > 0;

  async function saveHolidays() {
    setSavingHolidays(true);
    try {
      const finalList = buildFinalHolidays();
      const res = await fetch("/api/holidays/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, month, holidays: finalList }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to save.");
        return;
      }
      toast.success(data.message);
      setHolidayDraft({});
      loadHolidays();
    } catch {
      toast.error("Network error.");
    } finally {
      setSavingHolidays(false);
    }
  }

  function toggleClassSelection(cls: string) {
    setSelectedClasses((prev) =>
      prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]
    );
  }

  function selectAllClasses() {
    setSelectedClasses([...classes]);
  }

  function clearClassSelection() {
    setSelectedClasses([]);
  }

  async function generateSheets() {
    if (selectedClasses.length === 0) {
      toast.error("Please select at least one class.");
      return;
    }
    setLoadingStudents(true);
    try {
      const results: Record<string, Student[]> = {};
      for (const cls of selectedClasses) {
        const params = new URLSearchParams({
          class: cls,
          status: "ACTIVE",
          pageSize: "500",
        });
        const res = await fetch(`/api/students?${params.toString()}`, {
          cache: "no-store",
        });
        const data = await res.json();
        if (data.students) {
          const sorted = [...data.students].sort((a, b) => {
            const ra = a.rollNumber || "";
            const rb = b.rollNumber || "";
            if (ra && rb) {
              const na = parseInt(ra, 10);
              const nb = parseInt(rb, 10);
              if (!isNaN(na) && !isNaN(nb)) return na - nb;
              return ra.localeCompare(rb);
            }
            if (ra && !rb) return -1;
            if (!ra && rb) return 1;
            return a.name.localeCompare(b.name);
          });
          results[cls] = sorted;
        }
      }
      setStudentsByClass(results);
      setGenerated(true);
      const totalStudents = Object.values(results).reduce(
        (s, arr) => s + arr.length,
        0
      );
      toast.success(
        `${selectedClasses.length} class sheet(s) generated · ${totalStudents} students total.`
      );
    } catch {
      toast.error("Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  function isHoliday(day: number): { label: string } | null {
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const dt = new Date(year, month - 1, day);
    const isSunday = dt.getDay() === 0;
    const info = getHolidayInfo(dateStr, isSunday);
    return info ? { label: info.label } : null;
  }

  const totalSelectedStudents = Object.values(studentsByClass).reduce(
    (s, arr) => s + arr.length,
    0
  );

  return (
    <div className="space-y-6">
      <div className="no-print">
        <h2 className="text-2xl font-bold tracking-tight">
          Monthly Attendance Sheet
        </h2>
        <p className="text-sm text-muted-foreground">
          Select multiple classes, mark holidays on the calendar, then generate
          and print attendance sheets.
        </p>
      </div>

      {/* Setup card */}
      <Card className="no-print">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            Sheet Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Month/Year/Teacher row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Month</Label>
              <Select
                value={String(month)}
                onValueChange={(v) => setMonth(parseInt(v, 10))}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-1.5">
              <Label>Year</Label>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(parseInt(v, 10))}
              >
                <SelectTrigger>
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
            <div className="space-y-1.5">
              <Label>Teacher Name (optional)</Label>
              <Input
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Class teacher"
              />
            </div>
          </div>

          {/* Multi-class selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Select Classes ({selectedClasses.length}/{classes.length}{" "}
                selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={selectAllClasses}
                  type="button"
                >
                  <CheckSquare className="w-3.5 h-3.5 mr-1" />
                  Select All
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearClassSelection}
                  type="button"
                >
                  <Square className="w-3.5 h-3.5 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3 border rounded-lg">
                No classes available. Add students with class assignments first.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {sortClassesByOrder(classes).map((cls) => (
                  <label
                    key={cls}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedClasses.includes(cls)
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <Checkbox
                      checked={selectedClasses.includes(cls)}
                      onCheckedChange={() => toggleClassSelection(cls)}
                    />
                    <span className="text-sm">{cls}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Sunday toggle - using Switch for clear on/off */}
          <div className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 p-3">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-secondary-foreground" />
              <div>
                <Label className="text-sm font-medium">
                  Auto-mark Sundays as holidays
                </Label>
                <p className="text-xs text-muted-foreground">
                  Turn off if Sundays are working days for this month. Click any
                  date to cycle: SCH → PUB → CST → None.
                </p>
              </div>
            </div>
            <Switch
              checked={includeSundays}
              onCheckedChange={(checked) => setIncludeSundays(checked)}
            />
          </div>

          {/* Holiday calendar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <Label className="text-sm font-semibold">
                Holiday Calendar — {MONTHS[month - 1]} {year}
              </Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-muted/30">
                  {finalHolidays.length} holiday(s) marked
                </Badge>
                {hasUnsavedChanges && (
                  <span className="text-xs text-amber-600 font-medium">
                    Unsaved changes
                  </span>
                )}
                {hasUnsavedChanges && (
                  <Button
                    size="sm"
                    onClick={saveHolidays}
                    disabled={savingHolidays}
                    className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
                  >
                    <Save className="w-3.5 h-3.5 mr-1" />
                    {savingHolidays ? "Saving..." : "Save All Holidays"}
                  </Button>
                )}
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Click any date to cycle through holiday types: School Holiday →
              Public Holiday → Custom Holiday → None. Sundays are auto-marked
              when the toggle above is on. All changes save at once with the
              &quot;Save All Holidays&quot; button.
            </p>

            {/* Calendar grid */}
            <div className="rounded-lg border p-3 bg-background">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-1">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div
                    key={d}
                    className={`text-center text-[10px] font-bold py-1 ${
                      d === "Sun"
                        ? "text-secondary-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {d}
                  </div>
                ))}
              </div>
              {/* Calendar cells */}
              <div className="grid grid-cols-7 gap-1">
                {calendar.map((cell, idx) => {
                  if (!cell.dateStr) {
                    return <div key={idx} className="aspect-square" />;
                  }
                  const info = getHolidayInfo(
                    cell.dateStr,
                    cell.isSunday
                  );
                  const isHoliday = !!info;
                  return (
                    <button
                      key={idx}
                      onClick={() =>
                        toggleHoliday(cell.dateStr!, cell.isSunday)
                      }
                      className={`aspect-square rounded border text-[11px] flex flex-col items-center justify-center transition-all hover:scale-105 ${
                        isHoliday && info
                          ? HOLIDAY_COLORS[info.label] ||
                            "bg-amber-100 text-amber-700 border-amber-400"
                          : "border-border hover:border-primary hover:bg-primary/5"
                      } ${
                        cell.isSunday && !isHoliday
                          ? "ring-1 ring-secondary/30"
                          : ""
                      }`}
                      title={
                        info
                          ? `${info.label} (click to change)`
                          : "Click to mark as holiday"
                      }
                    >
                      <span className="font-bold">{cell.day}</span>
                      {info && (
                        <span className="text-[7px] leading-none mt-0.5 px-0.5 truncate w-full text-center font-bold">
                          {HOLIDAY_SHORT[info.label] || "H"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Legend */}
              <div className="mt-2 pt-2 border-t flex flex-wrap gap-2 text-[9px]">
                {HOLIDAY_LABELS.map((l) => (
                  <div
                    key={l}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded border ${HOLIDAY_COLORS[l]}`}
                  >
                    {HOLIDAY_SHORT[l]} = {l}
                  </div>
                ))}
                <div className="text-muted-foreground ml-auto">
                  Click date to cycle type
                </div>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedClasses.length} class(es) selected ·{" "}
              {finalHolidays.length} holiday(s) for {MONTHS[month - 1]} {year}
            </div>
            <div className="flex flex-wrap gap-2">
              {generated &&
                selectedClasses.every(
                  (c) => studentsByClass[c] !== undefined
                ) &&
                totalSelectedStudents > 0 && (
                  <Button
                    onClick={handlePrint}
                    className="bg-primary hover:bg-primary/90"
                  >
                    <Printer className="w-4 h-4 mr-1" />
                    Print All Sheets (A4 Landscape)
                  </Button>
                )}
              <Button
                onClick={generateSheets}
                disabled={loadingStudents || selectedClasses.length === 0}
                variant={generated ? "outline" : "default"}
                className={!generated ? "bg-primary hover:bg-primary/90" : ""}
              >
                {loadingStudents
                  ? "Loading..."
                  : generated
                  ? "Regenerate Sheets"
                  : "Generate Attendance Sheets"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* On-screen preview for each class */}
      {generated &&
        selectedClasses.map((cls) => {
          const students = studentsByClass[cls] || [];
          return (
            <Card key={cls} className="no-print">
              <CardHeader>
                <CardTitle className="text-base">
                  {cls} — {students.length} students
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {students.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">
                    No active students in {cls}.
                  </div>
                ) : (
                  <AttendanceSheetPreview
                    students={students}
                    month={month}
                    year={year}
                    className={cls}
                    teacherName={teacherName}
                    days={days}
                    isHoliday={isHoliday}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}

      {/* Print version - SINGLE table with all classes, class heading rows inside the table */}
      {generated && totalSelectedStudents > 0 && (
        <div className="hidden print:block print-area print-attendance">
          {/* School header at top */}
          <div className="text-center mb-2">
            <div className="flex items-center justify-center gap-2 mb-1">
              <img
                src={SCHOOL.logo}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-full bg-white"
              />
              <div>
                <h1 className="text-sm font-bold">{SCHOOL.name}</h1>
                <p className="text-[8px]">{SCHOOL.address}</p>
                <p className="text-[8px] font-semibold">{SCHOOL.phones}</p>
              </div>
            </div>
            <h2 className="text-[10px] font-bold mt-0.5">
              Attendance Sheet — {MONTHS[month - 1]} {year}
              {teacherName && ` · Teacher: ${teacherName}`}
            </h2>
          </div>

          {/* Single unified table with all classes */}
          <SingleTableAttendance
            sortedClasses={sortClassesByOrder(
              selectedClasses.filter(
                (c) => (studentsByClass[c] || []).length > 0
              )
            )}
            studentsByClass={studentsByClass}
            days={days}
            isHoliday={isHoliday}
          />

          {/* Signatures at the bottom */}
          <div
            className="mt-6 grid grid-cols-2 gap-12 text-[9px]"
            style={{ paddingTop: "10px" }}
          >
            <div className="text-center">
              <div className="border-t border-black pt-0.5">
                Class Teacher&apos;s Signature
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-0.5">
                Principal / Head Teacher&apos;s Signature
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface SheetProps {
  students: Student[];
  month: number;
  year: number;
  className: string;
  teacherName: string;
  days: number;
  isHoliday: (day: number) => { label: string } | null;
  showHeader?: boolean;
}

// Single unified table for print - all classes in ONE table with class heading rows
// No # column - only Roll, Student Name, day columns, and Remarks
function SingleTableAttendance({
  sortedClasses,
  studentsByClass,
  days,
  isHoliday,
}: {
  sortedClasses: string[];
  studentsByClass: Record<string, Student[]>;
  days: number;
  isHoliday: (day: number) => { label: string } | null;
}) {
  const dayArr = Array.from({ length: days }, (_, i) => i + 1);
  const totalCols = 2 + days + 1; // Roll + Name + days + Remarks (no # column)

  return (
    <table className="w-full attendance-table-print">
      <thead>
        <tr>
          <th>Roll</th>
          <th className="text-left">Student Name</th>
          {dayArr.map((d) => {
            const h = isHoliday(d);
            return (
              <th key={d} className={h ? "holiday-cell" : "day-col"}>
                {h ? "H" : d}
              </th>
            );
          })}
          <th className="text-left">Remarks</th>
        </tr>
      </thead>
      <tbody>
        {sortedClasses.map((cls) => {
          const students = studentsByClass[cls] || [];
          if (students.length === 0) return null;
          return (
            <React.Fragment key={cls}>
              {/* Class heading row */}
              <tr className="class-heading-row">
                <td
                  colSpan={totalCols}
                  className="class-heading-cell"
                >
                  Class: {cls} ({students.length} students)
                </td>
              </tr>
              {/* Student rows */}
              {students.map((s, idx) => (
                <tr key={s.id}>
                  <td>{s.rollNumber || "-"}</td>
                  <td className="text-left student-name-cell">
                    {s.name}
                  </td>
                  {dayArr.map((d) => {
                    const h = isHoliday(d);
                    return (
                      <td
                        key={d}
                        className={h ? "holiday-cell" : "day-col"}
                      >
                        {h ? (
                          <span className="holiday-mark">H</span>
                        ) : (
                          ""
                        )}
                      </td>
                    );
                  })}
                  <td className="text-left"></td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

function AttendanceSheetPreview(props: SheetProps) {
  return (
    <div className="p-4 overflow-x-auto">
      <AttendanceSheetContent {...props} />
    </div>
  );
}

function AttendanceSheetContent({
  students,
  month,
  year,
  className,
  teacherName,
  days,
  isHoliday,
  showHeader = true,
}: SheetProps) {
  const dayArr = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="bg-white text-black">
      {/* Header - only show for standalone/preview, not in multi-class print */}
      {showHeader && (
        <div className="text-center mb-3">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img
              src={SCHOOL.logo}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-full bg-white"
            />
            <div>
              <h1 className="text-xl font-bold">{SCHOOL.name}</h1>
              <p className="text-[10px]">{SCHOOL.address}</p>
              <p className="text-[10px] font-semibold">{SCHOOL.phones}</p>
            </div>
          </div>
          <h2 className="text-base font-bold mt-2">
            Monthly Attendance Sheet — {MONTHS[month - 1]} {year}
          </h2>
          <p className="text-sm">
            Class: <strong>{className}</strong>
            {teacherName && (
              <>
                {" "}
                &middot; Teacher: <strong>{teacherName}</strong>
              </>
            )}
          </p>
        </div>
      )}

      {/* Class label for print version */}
      {!showHeader && (
        <p className="text-sm" style={{ marginBottom: "4px" }}>
          <strong>Class: {className}</strong>
          {teacherName && (
            <>
              {" "}
              &middot; Teacher: <strong>{teacherName}</strong>
            </>
          )}
        </p>
      )}

      {/* Table */}
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th
              className="p-1 text-center"
              style={{ minWidth: "36px", width: "36px" }}
            >
              Roll
            </th>
            <th
              className="p-1 text-left"
              style={{ minWidth: "150px", width: "150px" }}
            >
              Student Name
            </th>
            {dayArr.map((d) => {
              const h = isHoliday(d);
              return (
                <th
                  key={d}
                  className={`p-0.5 text-center ${h ? "holiday-cell" : ""}`}
                  style={{ minWidth: "20px", width: "20px" }}
                  title={h ? h.label : ""}
                >
                  {h ? "H" : d}
                </th>
              );
            })}
            <th
              className="p-1 text-left"
              style={{ minWidth: "70px", width: "70px" }}
            >
              Remarks
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((s, idx) => (
            <tr key={s.id}>
              <td className="p-1 text-center text-[10px]">
                {s.rollNumber || "-"}
              </td>
              <td className="p-1 text-left text-[11px] whitespace-nowrap">
                {s.name}
              </td>
              {dayArr.map((d) => {
                const h = isHoliday(d);
                return (
                  <td
                    key={d}
                    className={`p-0.5 text-center ${h ? "holiday-cell" : ""}`}
                  >
                    {h ? (
                      <span className="text-[8px] font-bold">H</span>
                    ) : (
                      <span>&nbsp;</span>
                    )}
                  </td>
                );
              })}
              <td className="p-1 text-left">
                <span>&nbsp;</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend & signatures - only show in standalone/preview */}
      {showHeader && (
        <>
          <div className="mt-3 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div
                  className="inline-block w-3 h-3 bg-black"
                  style={{ border: "1px solid #000" }}
                />
                <span>HOLIDAY (H)</span>
              </div>
              <span>&middot; Mark P = Present, A = Absent, L = Late</span>
            </div>
            <div>
              Total Students: <strong>{students.length}</strong>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-12 text-xs">
            <div className="text-center">
              <div className="border-t border-black pt-1">
                Class Teacher&apos;s Signature
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-1">
                Principal / Head Teacher&apos;s Signature
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
