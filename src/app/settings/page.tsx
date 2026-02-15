"use client";

import { useSprint, useCalendarStatus } from "@/lib/hooks";
import { Card, Badge, Button, Input, Skeleton } from "@/components/ui";
import { Settings as SettingsIcon, Download, RotateCcw, Calendar, Palette } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SettingsPage() {
  const { sprint, loading, updateSprint } = useSprint();
  const { connected: calendarConnected, loading: calendarLoading, refetch: refetchCalendar } = useCalendarStatus();
  const [sprintName, setSprintName] = useState("");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Initialize form from sprint data
  const currentSprint = sprint?.currentSprint;
  if (currentSprint && !sprintName) {
    setSprintName(currentSprint.name);
    setSprintStart(currentSprint.startDate);
    setSprintEnd(currentSprint.endDate);
  }

  const handleExport = async () => {
    try {
      const files = ["sprint", "tasks", "kanban", "content", "memory", "analytics", "docs"];
      const data: Record<string, unknown> = {};
      for (const file of files) {
        const res = await fetch(`/api/${file}`);
        data[file] = await res.json();
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `deeper-prime-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported");
    } catch {
      toast.error("Export failed");
    }
  };

  const handleSprintUpdate = async () => {
    if (!currentSprint) return;
    await updateSprint({
      currentSprint: {
        ...currentSprint,
        name: sprintName,
        startDate: sprintStart,
        endDate: sprintEnd,
      },
    });
    toast.success("Sprint settings updated");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl">Settings</h1>
        <p className="text-text-secondary text-sm mt-1">Manage your Deeper Prime HQ configuration</p>
      </div>

      {/* Sprint Configuration */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <SettingsIcon size={18} className="text-accent" />
          <h2 className="font-heading text-lg">Sprint Configuration</h2>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-text-secondary mb-1 block">Sprint Name</label>
            <Input value={sprintName} onChange={setSprintName} placeholder="Sprint name..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-text-secondary mb-1 block">Start Date</label>
              <input
                type="date"
                value={sprintStart}
                onChange={(e) => setSprintStart(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              />
            </div>
            <div>
              <label className="text-xs text-text-secondary mb-1 block">End Date</label>
              <input
                type="date"
                value={sprintEnd}
                onChange={(e) => setSprintEnd(e.target.value)}
                className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
              />
            </div>
          </div>
          <Button onClick={handleSprintUpdate}>Save Sprint Settings</Button>
        </div>
      </Card>

      {/* Categories */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-accent" />
          <h2 className="font-heading text-lg">Task Categories</h2>
        </div>
        <div className="space-y-2">
          {["deeper-prime", "personal", "work", "health"].map((cat) => (
            <div key={cat} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
              <span className="text-sm">{cat}</span>
              <span className="text-xs text-text-secondary">default</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-secondary mt-3">
          Category management will be available in a future update
        </p>
      </Card>

      {/* Calendar */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-accent" />
          <h2 className="font-heading text-lg">Calendar Connection</h2>
        </div>
        <p className="text-sm text-text-secondary mb-3">
          Connect your Google Calendar to overlay events with your Deeper Prime tasks.
        </p>
        {calendarLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : calendarConnected ? (
          <div className="flex items-center gap-3">
            <Badge color="success">Connected</Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  await fetch("/api/calendar/disconnect", { method: "POST" });
                  toast.success("Google Calendar disconnected");
                  refetchCalendar();
                } catch {
                  toast.error("Failed to disconnect");
                }
              }}
            >
              Disconnect
            </Button>
          </div>
        ) : (
          <Button
            variant="secondary"
            onClick={async () => {
              try {
                const res = await fetch("/api/calendar/auth");
                const data = await res.json();
                if (data.url) {
                  window.location.href = data.url;
                } else {
                  toast.error(data.error ?? "Failed to start connection");
                }
              } catch {
                toast.error("Failed to connect — check that Google credentials are configured");
              }
            }}
          >
            Connect Google Calendar
          </Button>
        )}
      </Card>

      {/* Data Management */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Download size={18} className="text-accent" />
          <h2 className="font-heading text-lg">Data Management</h2>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">Export All Data</p>
              <p className="text-xs text-text-secondary">Download all JSON data as a single file</p>
            </div>
            <Button variant="secondary" onClick={handleExport}>
              <span className="flex items-center gap-1.5">
                <Download size={14} /> Export
              </span>
            </Button>
          </div>

          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-danger">Reset All Data</p>
                <p className="text-xs text-text-secondary">
                  This will reset all data to defaults. This action cannot be undone.
                </p>
              </div>
              {showResetConfirm ? (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowResetConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      toast.info("Run 'bash scripts/setup.sh' to reset data directory");
                      setShowResetConfirm(false);
                    }}
                  >
                    Confirm Reset
                  </Button>
                </div>
              ) : (
                <Button variant="danger" onClick={() => setShowResetConfirm(true)}>
                  <span className="flex items-center gap-1.5">
                    <RotateCcw size={14} /> Reset
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Sync Info */}
      <Card>
        <h2 className="font-heading text-lg mb-3">Syncthing Status</h2>
        <p className="text-sm text-text-secondary">
          Data directory is synced between machines via Syncthing. Any changes made in the dashboard
          or by Apollo will be automatically synced.
        </p>
        <div className="mt-3 p-3 bg-bg rounded-lg border border-border">
          <p className="text-xs font-mono text-text-secondary">
            DATA_DIR: {typeof window !== "undefined" ? "(check .env.local)" : ""}
          </p>
        </div>
      </Card>
    </div>
  );
}
