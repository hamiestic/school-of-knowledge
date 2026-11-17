"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  KeyRound,
  UserCog,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/constants";
import { toast } from "sonner";

interface Admin {
  id: string;
  username: string;
  name: string | null;
  createdAt: string;
}

interface AdminManagementProps {
  currentUser: { username: string; name: string | null } | null;
}

export function AdminManagement({ currentUser }: AdminManagementProps) {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);

  // Password change dialog state
  const [pwdTarget, setPwdTarget] = useState<Admin | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [changingPwd, setChangingPwd] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/admins", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.admins && setAdmins(d.admins))
      .catch(() => toast.error("Failed to load admins."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    if (!newUsername.trim()) {
      toast.error("Username is required.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      toast.error("Password must be at least 4 characters.");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          name: newName.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create admin.");
        return;
      }
      toast.success(data.message);
      setNewName("");
      setNewUsername("");
      setNewPassword("");
      setShowCreate(false);
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setCreating(false);
    }
  }

  async function deleteAdmin(a: Admin) {
    if (a.username === currentUser?.username) {
      toast.error("You cannot delete your own account while logged in.");
      return;
    }
    if (!confirm(`Delete admin account '${a.username}'? This cannot be undone.`))
      return;
    try {
      const res = await fetch(`/api/admins/${a.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success(data.message);
      load();
    } catch {
      toast.error("Network error.");
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!pwdTarget) return;
    if (!pwdValue || pwdValue.length < 4) {
      toast.error("New password must be at least 4 characters.");
      return;
    }
    setChangingPwd(true);
    try {
      const res = await fetch(`/api/admins/${pwdTarget.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pwdValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success(`Password updated for '${pwdTarget.username}'.`);
      setPwdTarget(null);
      setPwdValue("");
    } catch {
      toast.error("Network error.");
    } finally {
      setChangingPwd(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Administrator Accounts
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Create and manage admin logins for school staff. Each admin can sign
          in with their own username and password.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {admins.length} admin account{admins.length !== 1 ? "s" : ""}{" "}
            registered
          </p>
          <Button
            size="sm"
            onClick={() => setShowCreate(!showCreate)}
            className="bg-primary hover:bg-primary/90"
          >
            <Plus className="w-4 h-4 mr-1" />
            {showCreate ? "Cancel" : "Create New Admin"}
          </Button>
        </div>

        {/* Create new admin form */}
        {showCreate && (
          <form
            onSubmit={createAdmin}
            className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Name</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Username <span className="text-rose-600">*</span>
                </Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="login username"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">
                  Password <span className="text-rose-600">*</span>
                </Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="min 4 characters"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setNewName("");
                  setNewUsername("");
                  setNewPassword("");
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={creating}
                className="bg-primary hover:bg-primary/90"
              >
                {creating ? "Creating..." : "Create Admin Account"}
              </Button>
            </div>
          </form>
        )}

        {/* Admins list */}
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40">
                <th className="text-left p-2">Name</th>
                <th className="text-left p-2">Username</th>
                <th className="text-left p-2">Created</th>
                <th className="text-right p-2 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 2 }).map((_, i) => (
                  <tr key={i}>
                    <td className="p-2">
                      <Skeleton className="h-5 w-32" />
                    </td>
                    <td className="p-2">
                      <Skeleton className="h-5 w-24" />
                    </td>
                    <td className="p-2">
                      <Skeleton className="h-5 w-20" />
                    </td>
                    <td className="p-2" />
                  </tr>
                ))
              ) : admins.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-muted-foreground"
                  >
                    No admin accounts found.
                  </td>
                </tr>
              ) : (
                admins.map((a) => (
                  <tr key={a.id} className="border-t hover:bg-muted/30">
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                          {(a.name || a.username).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">
                          {a.name || "—"}
                        </span>
                        {a.username === currentUser?.username && (
                          <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 text-[10px]">
                            You
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="p-2 font-mono text-xs">@{a.username}</td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {formatDate(a.createdAt)}
                    </td>
                    <td className="p-2 text-right">
                      <div className="flex gap-1 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setPwdTarget(a);
                            setPwdValue("");
                          }}
                          title="Reset password"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAdmin(a)}
                          className="text-rose-600 hover:bg-rose-50"
                          disabled={a.username === currentUser?.username}
                          title={
                            a.username === currentUser?.username
                              ? "Cannot delete your own account"
                              : "Delete admin"
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Change password dialog */}
        {pwdTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
            <div className="bg-background rounded-lg shadow-xl w-full max-w-md p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    Reset Password
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Set a new password for{" "}
                    <span className="font-semibold">@{pwdTarget.username}</span>
                    {pwdTarget.name ? ` (${pwdTarget.name})` : ""}.
                  </p>
                </div>
              </div>
              <form onSubmit={changePassword} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="newpwd">New Password</Label>
                  <Input
                    id="newpwd"
                    type="password"
                    value={pwdValue}
                    onChange={(e) => setPwdValue(e.target.value)}
                    placeholder="Min 4 characters"
                    required
                    autoFocus
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPwdTarget(null);
                      setPwdValue("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={changingPwd}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {changingPwd ? "Saving..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
