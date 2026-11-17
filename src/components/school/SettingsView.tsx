"use client";

import { useCallback, useEffect, useState } from "react";
import { Settings as SettingsIcon, Plus, Trash2, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { AdminManagement } from "./AdminManagement";

interface DefaultCat {
  id: string;
  description: string;
  amount: number;
}

interface SettingsViewProps {
  currentUser: { username: string; name: string | null } | null;
}

export function SettingsView({ currentUser }: SettingsViewProps) {
  const [cats, setCats] = useState<DefaultCat[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDesc, setNewDesc] = useState("");
  const [newAmt, setNewAmt] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/default-categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => d.categories && setCats(d.categories))
      .catch(() => toast.error("Failed to load categories."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function addCategory() {
    if (!newDesc.trim()) {
      toast.error("Description is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/default-categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newDesc.trim(),
          amount: newAmt ? parseFloat(newAmt) : 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success("Category saved.");
      setNewDesc("");
      setNewAmt("");
      load();
    } catch {
      toast.error("Network error.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCategory(desc: string) {
    if (!confirm(`Remove "${desc}" from default categories?`)) return;
    try {
      const res = await fetch(
        `/api/default-categories?description=${encodeURIComponent(desc)}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed.");
        return;
      }
      toast.success("Category removed.");
      load();
    } catch {
      toast.error("Network error.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-sm text-muted-foreground">
          Manage admin accounts and default fee categories.
        </p>
      </div>

      {/* Admin account management */}
      <AdminManagement currentUser={currentUser} />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Default Fee Categories
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            These categories are pre-loaded whenever the administrator starts a
            new fee record. You can still add or remove categories on each
            individual fee record.
          </p>

          {/* Add new */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end">
            <div className="space-y-1.5 sm:col-span-7">
              <Label className="text-xs">Description</Label>
              <Input
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Exam Fee, Transport, Stationary..."
              />
            </div>
            <div className="space-y-1.5 sm:col-span-3">
              <Label className="text-xs">Default Amount (Rs.)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={newAmt}
                onChange={(e) => setNewAmt(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button
              onClick={addCategory}
              disabled={saving}
              className="sm:col-span-2 bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* List */}
          <div className="border rounded-lg overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40">
                  <th className="text-left p-2">Description</th>
                  <th className="text-right p-2">Default Amount</th>
                  <th className="text-right p-2 w-20">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      <td className="p-2">
                        <Skeleton className="h-5 w-40" />
                      </td>
                      <td className="p-2">
                        <Skeleton className="h-5 w-20 ml-auto" />
                      </td>
                      <td className="p-2" />
                    </tr>
                  ))
                ) : cats.length === 0 ? (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-6 text-center text-muted-foreground"
                    >
                      No default categories yet. Add some above.
                    </td>
                  </tr>
                ) : (
                  cats.map((c) => (
                    <tr key={c.id} className="border-t hover:bg-muted/30">
                      <td className="p-2 font-medium">{c.description}</td>
                      <td className="p-2 text-right">
                        {c.amount > 0
                          ? `Rs. ${c.amount.toLocaleString("en-PK")}`
                          : "-"}
                      </td>
                      <td className="p-2 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCategory(c.description)}
                          className="text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="rounded-lg bg-muted/40 p-4 text-sm">
            <div className="flex items-start gap-2">
              <SettingsIcon className="w-4 h-4 mt-0.5 text-primary shrink-0" />
              <div className="text-muted-foreground">
                <p className="font-semibold text-foreground mb-1">
                  How fees work in this system:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-xs">
                  <li>
                    Each student can have one fee record per month/year —
                    duplicates are prevented automatically.
                  </li>
                  <li>
                    Multiple payments can be collected against the same monthly
                    fee record, each generating a unique receipt number.
                  </li>
                  <li>
                    The previous month&apos;s outstanding balance is
                    automatically carried forward as &quot;Previous
                    Outstanding&quot;.
                  </li>
                  <li>
                    Deactivating a student preserves all historical fee records
                    and receipts.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
