"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LoginScreen } from "@/components/school/LoginScreen";
import { Sidebar } from "@/components/school/Sidebar";
import { DashboardView } from "@/components/school/DashboardView";
import { StudentsView } from "@/components/school/StudentsView";
import { FeeManagementView } from "@/components/school/FeeManagementView";
import { AttendanceView } from "@/components/school/AttendanceView";
import { ReportsView } from "@/components/school/ReportsView";
import { SettingsView } from "@/components/school/SettingsView";
import { StudentDetailDialog } from "@/components/school/StudentDetailDialog";
import { ViewKey, Student } from "@/lib/constants";
import {
  installFetchInterceptor,
  getToken,
  clearToken,
} from "@/lib/client-auth";
import { toast } from "sonner";

export default function Home() {
  const [authChecked, setAuthChecked] = useState(false);
  const [user, setUser] = useState<{
    username: string;
    name: string | null;
  } | null>(null);
  const [view, setView] = useState<ViewKey>("dashboard");

  // Presets from quick actions
  const [presetStudent, setPresetStudent] = useState<Student | null>(null);
  const [presetStudentId, setPresetStudentId] = useState<string | null>(null);

  // Student detail dialog
  const [viewStudent, setViewStudent] = useState<Student | null>(null);

  useEffect(() => {
    // Install fetch interceptor to attach Authorization header
    installFetchInterceptor();
    // Check existing session (token from localStorage)
    const token = getToken();
    if (!token) {
      // Defer state update to avoid synchronous setState in effect
      Promise.resolve().then(() => setAuthChecked(true));
      return;
    }
    fetch("/api/auth/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.authenticated && d.user) setUser(d.user);
        else clearToken(); // token invalid, clear it
      })
      .catch(() => {})
      .finally(() => setAuthChecked(true));
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    clearToken();
    setUser(null);
    setView("dashboard");
    toast.success("Logged out successfully.");
  }

  function navigate(v: ViewKey) {
    setView(v);
    // Clear presets when navigating away from fees/students
    if (v !== "fees") setPresetStudent(null);
    if (v !== "students") setPresetStudentId(null);
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLoggedIn={setUser} />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        current={view}
        onNavigate={navigate}
        onLogout={handleLogout}
        user={user}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              {view === "dashboard" && <DashboardView onNavigate={navigate} />}
              {view === "students" && (
                <StudentsView
                  onCollectFee={(s) => {
                    setPresetStudent(s);
                    navigate("fees");
                  }}
                  onViewStudent={(s) => setViewStudent(s)}
                  presetStudentId={presetStudentId}
                  clearPreset={() => setPresetStudentId(null)}
                />
              )}
              {view === "fees" && (
                <FeeManagementView
                  presetStudent={presetStudent}
                  clearPreset={() => setPresetStudent(null)}
                />
              )}
              {view === "attendance" && <AttendanceView />}
              {view === "reports" && <ReportsView />}
              {view === "settings" && <SettingsView currentUser={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <StudentDetailDialog
        student={viewStudent}
        onClose={() => setViewStudent(null)}
      />
    </div>
  );
}
