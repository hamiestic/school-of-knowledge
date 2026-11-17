"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Wallet,
  TrendingUp,
  AlertCircle,
  UserCheck,
  UserX,
  Plus,
  Receipt,
  CalendarDays,
  FileBarChart,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatMoney,
  formatDate,
  MONTHS,
  ViewKey,
  SCHOOL,
  getYearOptions,
} from "@/lib/constants";

interface DashboardData {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  totalExpectedMonthly: number;
  totalCollectedSelectedMonth: number;
  totalRemainingMonthly: number;
  outstandingSelectedMonth: number;
  studentsWithRecords: number;
  studentsWithoutRecords: number;
  totalCollectedAllTime: number;
  totalOutstanding: number;
  studentsPerClass: Array<{ className: string; count: number }>;
  recentPayments: Array<{
    id: string;
    receiptNumber: string;
    amountPaid: number;
    paymentDate: string;
    studentName: string;
    studentId: string;
    month: number;
    year: number;
  }>;
  selectedMonth: number;
  selectedYear: number;
  selectedMonthName: string;
  isCurrentMonth: boolean;
  currentMonthName: string;
  currentMonth: number;
  currentYear: number;
}

interface DashboardViewProps {
  onNavigate: (v: ViewKey) => void;
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Load dashboard data for the selected month
  const loadData = useCallback(
    (month: number, year: number) => {
      fetch(
        `/api/dashboard?month=${month}&year=${year}`,
        { cache: "no-store" }
      )
        .then((r) => r.json())
        .then((d) => {
          if (!d.error) setData(d);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    },
    []
  );

  useEffect(() => {
    loadData(selectedMonth, selectedYear);
  }, [loadData, selectedMonth, selectedYear]);

  // Year options: 3 years back to 10 years forward (long-term use)
  const yearOptions = useMemo(() => getYearOptions(), []);

  const stats = [
    {
      label: "Total Registered Students",
      value: data ? String(data.totalStudents) : "-",
      sub: data
        ? `${data.activeStudents} active · ${data.inactiveStudents} inactive`
        : "",
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      label: `Expected Fee (${data?.selectedMonthName ?? ""} ${data?.selectedYear ?? ""})`,
      value: data ? formatMoney(data.totalExpectedMonthly) : "-",
      sub: "Total fee expected from all active students",
      icon: TrendingUp,
      color: "bg-secondary/20 text-secondary-foreground",
    },
    {
      label: `Collected (${data?.selectedMonthName ?? ""} ${data?.selectedYear ?? ""})`,
      value: data ? formatMoney(data.totalCollectedSelectedMonth) : "-",
      sub: data
        ? `${data.studentsWithRecords} of ${data.activeStudents} students have paid`
        : "",
      icon: Wallet,
      color: "bg-emerald-100 text-emerald-700",
    },
    {
      label: `Remaining (${data?.selectedMonthName ?? ""} ${data?.selectedYear ?? ""})`,
      value: data ? formatMoney(data.totalRemainingMonthly) : "-",
      sub: data
        ? `${data.studentsWithoutRecords} students haven't paid yet`
        : "",
      icon: AlertCircle,
      color: "bg-rose-100 text-rose-700",
    },
  ];

  const quickActions: Array<{
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    view: ViewKey;
    desc: string;
  }> = [
    {
      label: "Add New Student",
      icon: Plus,
      view: "students",
      desc: "Register a new student record",
    },
    {
      label: "Collect Fee",
      icon: Receipt,
      view: "fees",
      desc: "Generate fee record & collect payment",
    },
    {
      label: "Generate Attendance Sheet",
      icon: CalendarDays,
      view: "attendance",
      desc: "Print monthly class attendance sheet",
    },
    {
      label: "View Reports",
      icon: FileBarChart,
      view: "reports",
      desc: "Fee records and outstanding balances",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-4">
          <img
            src={SCHOOL.logo}
            alt="Logo"
            className="w-14 h-14 object-contain rounded-full bg-white ring-2 ring-primary/20 shadow-sm shrink-0"
          />
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              Overview of students, fees, and recent activity
            </p>
          </div>
        </div>
        {/* Month/Year selector for monthly data */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              Monthly Data:
            </span>
            <Select
              value={String(selectedMonth)}
              onValueChange={(v) => setSelectedMonth(parseInt(v, 10))}
            >
              <SelectTrigger className="w-28 h-8 text-xs">
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
              value={String(selectedYear)}
              onValueChange={(v) => setSelectedYear(parseInt(v, 10))}
            >
              <SelectTrigger className="w-20 h-8 text-xs">
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
          {data && !data.isCurrentMonth && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                const now = new Date();
                setSelectedMonth(now.getMonth() + 1);
                setSelectedYear(now.getFullYear());
              }}
            >
              Current Month
            </Button>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
            >
              <Card className="card-elegant stat-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        {s.label}
                      </p>
                      {loading ? (
                        <Skeleton className="h-8 w-28 mt-2" />
                      ) : (
                        <p className="text-2xl font-bold text-foreground mt-1 break-words">
                          {s.value}
                        </p>
                      )}
                      {s.sub && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.sub}
                        </p>
                      )}
                    </div>
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${s.color}`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  onClick={() => onNavigate(a.view)}
                  className="group flex flex-col items-start gap-2 p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="w-full">
                    <p className="text-sm font-semibold text-foreground">
                      {a.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary ml-auto transition-colors" />
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Students per class */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg">Students per Class</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data && data.studentsPerClass.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.studentsPerClass.map((c) => {
                  const maxCount = Math.max(
                    ...data.studentsPerClass.map((x) => x.count),
                    1
                  );
                  const pct = (c.count / maxCount) * 100;
                  return (
                    <div key={c.className} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-foreground">
                          {c.className}
                        </span>
                        <span className="text-muted-foreground">
                          {c.count}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No active students yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent payments */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-lg">Recent Fee Payments</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("reports")}
              className="text-primary hover:text-primary"
            >
              View all
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data && data.recentPayments.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {data.recentPayments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-[10px] bg-primary/5"
                        >
                          {p.receiptNumber}
                        </Badge>
                        <p className="text-sm font-semibold text-foreground truncate">
                          {p.studentName}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {p.studentId} &middot;{" "}
                        {MONTHS[p.month - 1]} {p.year} &middot;{" "}
                        {formatDate(p.paymentDate)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-emerald-700">
                        {formatMoney(p.amountPaid)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10">
                <Wallet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  No payments recorded yet.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => onNavigate("fees")}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Collect First Fee
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active / Inactive split */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.activeStudents}</p>
                <p className="text-xs text-muted-foreground">Active Students</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
                <UserX className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{data.inactiveStudents}</p>
                <p className="text-xs text-muted-foreground">
                  Inactive Students (records preserved)
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
