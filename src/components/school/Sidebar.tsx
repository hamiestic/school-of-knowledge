"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  Receipt,
  CalendarDays,
  FileBarChart,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SCHOOL, ViewKey } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface SidebarProps {
  current: ViewKey;
  onNavigate: (v: ViewKey) => void;
  onLogout: () => void;
  user: { username: string; name: string | null };
}

const NAV_ITEMS: {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "students", label: "Students", icon: Users },
  { key: "fees", label: "Fee Management", icon: Receipt },
  { key: "attendance", label: "Attendance", icon: CalendarDays },
  { key: "reports", label: "Reports", icon: FileBarChart },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

export function Sidebar({ current, onNavigate, onLogout, user }: SidebarProps) {
  const [open, setOpen] = useState(false);

  const content = (
    <>
      {/* Logo header */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-secondary/30 rounded-full blur-md" />
            <img
              src={SCHOOL.logo}
              alt="Logo"
              className="relative w-12 h-12 object-contain rounded-full bg-white ring-2 ring-secondary/40"
            />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-sidebar-foreground truncate leading-tight">
              {SCHOOL.name}
            </h1>
            <p className="text-[10px] text-secondary font-semibold tracking-wider uppercase mt-0.5">
              {SCHOOL.established}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <button
              key={item.key}
              onClick={() => {
                onNavigate(item.key);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative group",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              {active && (
                <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-1 h-6 bg-secondary rounded-r-full" />
              )}
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border space-y-3">
        <div className="text-[10px] text-sidebar-foreground/60 space-y-1">
          <div className="flex items-start gap-2">
            <Phone className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="truncate">{SCHOOL.phones}</span>
          </div>
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
            <span className="leading-snug">{SCHOOL.address}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 pt-2">
          <div className="min-w-0 flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-sidebar-primary text-sidebar-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
              {(user.name || user.username || "A").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-sidebar-foreground truncate">
                {user.name || user.username}
              </p>
              <p className="text-[10px] text-sidebar-foreground/50 truncate">
                @{user.username}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0 h-8 w-8 p-0"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-30 brand-bg text-primary-foreground flex items-center justify-between px-4 py-2.5 shadow-md no-print">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={SCHOOL.logo}
            alt="Logo"
            className="w-8 h-8 object-contain rounded-full bg-white shrink-0"
          />
          <div className="min-w-0">
            <p className="font-bold text-sm leading-tight truncate">
              {SCHOOL.name}
            </p>
            <p className="text-[9px] text-primary-foreground/70 leading-tight truncate">
              Management System
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(true)}
          className="text-primary-foreground hover:bg-primary-foreground/10 shrink-0 h-9 w-9 p-0"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 lg:w-64 shrink-0 flex-col bg-sidebar h-screen sticky top-0 no-print">
        {content}
      </aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden no-print">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-sidebar flex flex-col"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-sidebar-foreground/70 hover:text-sidebar-foreground p-1 rounded-md hover:bg-sidebar-accent z-10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            {content}
          </motion.div>
        </div>
      )}
    </>
  );
}
