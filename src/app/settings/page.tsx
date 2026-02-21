"use client";

import { useSprint, useCalendarStatus, useContent } from "@/lib/hooks";
import { Card, Badge, Button, Input, Skeleton } from "@/components/ui";
import { Settings as SettingsIcon, Download, RotateCcw, Calendar, Palette, Plus, Trash2, Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const PRESET_COLORS = [
  "#D97706", "#B45309", "#6B8F71", "#C2695B",
  "#7C6F9C", "#5B8A9C", "#9C8B5B", "#6B7280",
  "#A16207", "#065F46", "#9D174D", "#1D4ED8",
];

export default function SettingsPage() {
  const { sprint, loading, updateSprint } = useSprint();
  const { connected: calendarConnected, source: calendarSource, cachedAt, loading: calendarLoading, refetch: refetchCalendar } = useCalendarStatus();
  const { angles, loading: anglesLoading, addAngle, updateAngle, deleteAngle } = useContent();

  const [sprintName, setSprintName] = useState("");
  const [sprintStart, setSprintStart] = useState("");
  const [sprintEnd, setSprintEnd] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Angle management state
  const [newAngleName, setNewAngleName] = useState("");
  const [newAngleColor, setNewAngleColor] = useState(PRESET_COLORS[0]);
  const [editingAngleId, setEditingAngleId] = useState<string | null>(null);
  const [editAngleName, setEditAngleName] = useState("");
  const [editAngleColor, setEditAngleColor] = useState("");

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

      {/* Content Angles */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Palette size={18} className="text-accent" />
          <h2 className="font-heading text-lg">Content Angles</h2>
        </div>
        <p className="text-xs text-text-secondary mb-4">
          Angles are the thematic lenses you apply to content — the recurring narrative frames across all formats.
        </p>

        {anglesLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-9" />)}</div>
        ) : (
          <div className="space-y-2 mb-4">
            {angles.length === 0 && (
              <p className="text-xs text-text-secondary py-2">No angles yet. Add one below.</p>
            )}
            {angles.map((angle) => (
              <div key={angle.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                {editingAngleId === angle.id ? (
                  <>
                    <div className="flex gap-1">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditAngleColor(c)}
                          className={`w-4 h-4 rounded-full transition-transform ${editAngleColor === c ? "scale-125 ring-1 ring-white/40" : ""}`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                    <input
                      value={editAngleName}
                      onChange={(e) => setEditAngleName(e.target.value)}
                      className="flex-1 bg-surface border border-border rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:border-accent/50"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          updateAngle(angle.id, editAngleName, editAngleColor)
                            .then(() => { setEditingAngleId(null); toast.success("Angle updated"); })
                            .catch(() => toast.error("Failed to update"));
                        }
                        if (e.key === "Escape") setEditingAngleId(null);
                      }}
                      autoFocus
                    />
                    <button
                      onClick={() =>
                        updateAngle(angle.id, editAngleName, editAngleColor)
                          .then(() => { setEditingAngleId(null); toast.success("Angle updated"); })
                          .catch(() => toast.error("Failed to update"))
                      }
                      className="p-1 text-success hover:text-success/80 transition-colors"
                    >
                      <Check size={14} />
                    </button>
                    <button onClick={() => setEditingAngleId(null)} className="p-1 text-text-secondary hover:text-text-primary transition-colors">
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: angle.color }} />
                    <span
                      className="flex-1 text-sm cursor-pointer hover:text-accent transition-colors"
                      onClick={() => {
                        setEditingAngleId(angle.id);
                        setEditAngleName(angle.name);
                        setEditAngleColor(angle.color);
                      }}
                    >
                      {angle.name}
                    </span>
                    <button
                      onClick={() =>
                        deleteAngle(angle.id)
                          .then(() => toast.success("Angle deleted"))
                          .catch(() => toast.error("Failed to delete"))
                      }
                      className="p-1 text-text-secondary hover:text-danger transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add new angle */}
        <div className="pt-3 border-t border-border space-y-3">
          <p className="text-xs text-text-secondary uppercase tracking-wider">Add Angle</p>
          <div className="flex gap-1 flex-wrap">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setNewAngleColor(c)}
                className={`w-5 h-5 rounded-full transition-transform ${newAngleColor === c ? "scale-125 ring-1 ring-white/40" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <div className="w-4 h-4 rounded-full mt-2.5 flex-shrink-0" style={{ backgroundColor: newAngleColor }} />
            <Input
              value={newAngleName}
              onChange={setNewAngleName}
              placeholder="Angle name..."
              className="flex-1"
            />
            <Button
              onClick={() => {
                if (!newAngleName.trim()) return;
                addAngle(newAngleName.trim(), newAngleColor)
                  .then(() => { setNewAngleName(""); toast.success("Angle added"); })
                  .catch(() => toast.error("Failed to add angle"));
              }}
            >
              <span className="flex items-center gap-1"><Plus size={14} /> Add</span>
            </Button>
          </div>
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
          Calendar events are shown on the Calendar page and in daily agenda messages.
        </p>
        {calendarLoading ? (
          <Skeleton className="h-9 w-48" />
        ) : calendarSource === "apple" ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Badge color="success">Apple Calendar</Badge>
              {cachedAt && (
                <span className="text-xs text-text-secondary">
                  Last synced: {new Date(cachedAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}
                </span>
              )}
              {!cachedAt && (
                <span className="text-xs text-text-secondary">Reading directly via icalBuddy</span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Events are read from Apple Calendar automatically on each page load. The cache syncs to other machines via Syncthing.
            </p>
          </div>
        ) : calendarConnected ? (
          <div className="flex items-center gap-3">
            <Badge color="success">Google Calendar</Badge>
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
          <div className="space-y-2">
            <p className="text-xs text-text-secondary">
              Install icalBuddy (<code className="text-text-primary">brew install ical-buddy</code>) to read from Apple Calendar, or connect Google Calendar below.
            </p>
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
          </div>
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
