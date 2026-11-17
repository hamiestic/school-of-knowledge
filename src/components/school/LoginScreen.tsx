"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lock, User as UserIcon, KeyRound, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHOOL } from "@/lib/constants";
import { setToken, installFetchInterceptor } from "@/lib/client-auth";
import { toast } from "sonner";

interface LoginScreenProps {
  onLoggedIn: (user: { username: string; name: string | null }) => void;
}

export function LoginScreen({ onLoggedIn }: LoginScreenProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [username, setUsername] = useState("hamiestic");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("School Administrator");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    installFetchInterceptor();
    fetch("/api/auth/setup", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setNeedsSetup(!!data.needsSetup))
      .catch(() => setNeedsSetup(false));
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!username || !password) {
      toast.error("Please enter username and password.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Login failed.");
        return;
      }
      // Store token in localStorage for subsequent API calls
      if (data.token) {
        setToken(data.token);
      }
      toast.success("Welcome back, " + (data.user.name || data.user.username));
      onLoggedIn(data.user);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault();
    if (!password || password.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Setup failed.");
        return;
      }
      toast.success("Admin account created. Please log in.");
      setNeedsSetup(false);
      setPassword("");
      setConfirmPassword("");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel - rich navy gradient with logo */}
      <div className="lg:w-5/12 brand-bg text-primary-foreground flex flex-col justify-center items-center p-10 lg:p-16 relative overflow-hidden">
        {/* Decorative pattern */}
        <div
          className="absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px)",
            backgroundSize: "60px 60px, 40px 40px",
          }}
        />
        {/* Glow accents */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-secondary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-primary/30 rounded-full blur-3xl" />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center max-w-md"
        >
          {/* Logo */}
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-secondary/30 rounded-full blur-2xl" />
            <img
              src={SCHOOL.logo}
              alt="School of Knowledge Logo"
              className="relative w-32 h-32 lg:w-40 lg:h-40 object-contain rounded-full bg-white shadow-2xl ring-4 ring-white/30"
            />
          </div>
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
            {SCHOOL.name}
          </h1>
          <p className="mt-2 text-secondary text-sm font-semibold tracking-widest uppercase">
            {SCHOOL.established}
          </p>
          <p className="mt-4 text-primary-foreground/80 text-sm lg:text-base leading-relaxed">
            {SCHOOL.address}
          </p>
          <p className="mt-2 text-secondary text-sm font-semibold">
            {SCHOOL.phones}
          </p>
          <div className="mt-8 pt-6 border-t border-primary-foreground/20 text-xs text-primary-foreground/70 space-y-1">
            <p className="font-semibold tracking-wider uppercase">
              Management System
            </p>
            <p>Student Records · Fee Management · Attendance</p>
          </div>
        </motion.div>
      </div>

      {/* Form panel */}
      <div className="lg:w-7/12 flex-1 flex items-center justify-center p-6 sm:p-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="w-full max-w-md"
        >
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
              {needsSetup ? "First-Time Setup" : "Secure Administrator Access"}
            </div>
            <h2 className="text-3xl font-bold text-foreground">
              {needsSetup ? "Create Admin Account" : "Welcome Back"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {needsSetup
                ? "Set up the first administrator account to start managing the school."
                : "Sign in to manage students, fees, and attendance."}
            </p>
          </div>

          <form
            onSubmit={needsSetup ? handleSetup : handleLogin}
            className="space-y-4"
          >
            {needsSetup && (
              <div className="space-y-2">
                <Label htmlFor="name">Administrator Name</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-9 h-11"
                    placeholder="Administrator name"
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="admin"
                  autoComplete="username"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11"
                  placeholder="••••••••"
                  autoComplete={
                    needsSetup ? "new-password" : "current-password"
                  }
                />
              </div>
            </div>
            {needsSetup && (
              <div className="space-y-2">
                <Label htmlFor="confirm">Confirm Password</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirm"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-9 h-11"
                    placeholder="••••••••"
                  />
                </div>
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-11 mt-2 shadow-md hover:shadow-lg transition-all"
              size="lg"
            >
              {loading
                ? "Please wait..."
                : needsSetup
                ? "Create Admin Account"
                : "Sign In"}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-border space-y-2 text-xs text-muted-foreground">
            <div className="flex items-start gap-2">
              <Phone className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{SCHOOL.phones}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{SCHOOL.address}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
