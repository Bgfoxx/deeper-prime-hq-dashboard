"use client";

import { useSprint } from "@/lib/hooks";
import { Card, Badge, Button, ProgressBar, Skeleton, Textarea, Input } from "@/components/ui";
import { Target, ChevronDown, ChevronRight, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function SprintTracker() {
  const { sprint, loading, updateSprint } = useSprint();
  const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
  const [addingObjective, setAddingObjective] = useState<number | null>(null);
  const [newObjectiveText, setNewObjectiveText] = useState("");

  const currentSprint = sprint?.currentSprint;

  // Calculate current week
  let currentWeekNum = 1;
  if (currentSprint) {
    const start = new Date(currentSprint.startDate);
    const now = new Date();
    const elapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    currentWeekNum = Math.max(1, Math.ceil(elapsed / 7));
  }

  // Auto-expand current week
  const isExpanded = (weekNum: number) =>
    expandedWeeks.has(weekNum) || weekNum === currentWeekNum;

  const toggleWeek = (weekNum: number) => {
    setExpandedWeeks((prev) => {
      const next = new Set(prev);
      if (next.has(weekNum)) next.delete(weekNum);
      else next.add(weekNum);
      return next;
    });
  };

  const toggleObjective = async (weekNumber: number, objId: string, done: boolean) => {
    if (!currentSprint) return;
    const updated = {
      currentSprint: {
        ...currentSprint,
        weeks: currentSprint.weeks.map((w) =>
          w.weekNumber === weekNumber
            ? {
                ...w,
                objectives: w.objectives.map((o) =>
                  o.id === objId ? { ...o, done } : o
                ),
              }
            : w
        ),
      },
    };
    await updateSprint(updated);
    toast.success(done ? "Objective completed" : "Objective unchecked");
  };

  const updateReflections = async (weekNumber: number, reflections: string) => {
    if (!currentSprint) return;
    const updated = {
      currentSprint: {
        ...currentSprint,
        weeks: currentSprint.weeks.map((w) =>
          w.weekNumber === weekNumber ? { ...w, reflections } : w
        ),
      },
    };
    await updateSprint(updated);
    toast.success("Reflections saved");
  };

  const addObjective = async (weekNumber: number) => {
    if (!currentSprint || !newObjectiveText.trim()) return;
    const objId = `w${weekNumber}o${Date.now()}`;
    const updated = {
      currentSprint: {
        ...currentSprint,
        weeks: currentSprint.weeks.map((w) =>
          w.weekNumber === weekNumber
            ? {
                ...w,
                objectives: [
                  ...w.objectives,
                  { id: objId, text: newObjectiveText.trim(), done: false },
                ],
              }
            : w
        ),
      },
    };
    await updateSprint(updated);
    setNewObjectiveText("");
    setAddingObjective(null);
    toast.success("Objective added");
  };

  const removeObjective = async (weekNumber: number, objId: string) => {
    if (!currentSprint) return;
    const updated = {
      currentSprint: {
        ...currentSprint,
        weeks: currentSprint.weeks.map((w) =>
          w.weekNumber === weekNumber
            ? { ...w, objectives: w.objectives.filter((o) => o.id !== objId) }
            : w
        ),
      },
    };
    await updateSprint(updated);
    toast.success("Objective removed");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!currentSprint) {
    return (
      <div className="text-center py-20">
        <Target size={48} className="mx-auto text-text-secondary mb-4" />
        <h2 className="font-heading text-xl mb-2">No Active Sprint</h2>
        <p className="text-text-secondary">Set up your first sprint in Settings</p>
      </div>
    );
  }

  const sprintStart = new Date(currentSprint.startDate);
  const sprintEnd = new Date(currentSprint.endDate);
  const now = new Date();
  const totalDays = Math.ceil((sprintEnd.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24));
  const elapsedDays = Math.max(0, Math.min(totalDays, Math.ceil((now.getTime() - sprintStart.getTime()) / (1000 * 60 * 60 * 24))));

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-heading text-3xl">{currentSprint.name}</h1>
        <p className="text-text-secondary text-sm mt-1">{currentSprint.vision}</p>
      </div>

      {/* Overview */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-text-secondary">
              {currentSprint.startDate} → {currentSprint.endDate}
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-xl text-accent">Day {elapsedDays}</p>
            <p className="text-xs text-text-secondary">of {totalDays}</p>
          </div>
        </div>
        <ProgressBar value={elapsedDays} max={totalDays} />
      </Card>

      {/* Success Metrics */}
      <div>
        <h2 className="font-heading text-lg mb-4">Success Metrics</h2>
        <div className="grid grid-cols-2 gap-4">
          {currentSprint.successMetrics.map((metric) => (
            <Card key={metric.id} className="!p-4">
              <p className="text-sm mb-2">{metric.metric}</p>
              {metric.target && metric.current !== undefined ? (
                <div>
                  <div className="flex justify-between text-xs text-text-secondary mb-1">
                    <span>{metric.current}</span>
                    <span>{metric.target}</span>
                  </div>
                  <ProgressBar value={metric.current} max={metric.target} />
                </div>
              ) : (
                <Badge color={metric.status === "not-started" ? "muted" : "success"}>
                  {metric.status || "tracking"}
                </Badge>
              )}
            </Card>
          ))}
        </div>
      </div>

      {/* Weekly Accordion */}
      <div>
        <h2 className="font-heading text-lg mb-4">Weekly Plan</h2>
        <div className="space-y-2">
          {currentSprint.weeks.map((week) => {
            const expanded = isExpanded(week.weekNumber);
            const isCurrent = week.weekNumber === currentWeekNum;
            const completedCount = week.objectives.filter((o) => o.done).length;
            const totalCount = week.objectives.length;

            return (
              <Card
                key={week.weekNumber}
                className={`!p-0 overflow-hidden ${isCurrent ? "ring-1 ring-accent/30" : ""}`}
              >
                <button
                  onClick={() => toggleWeek(week.weekNumber)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div>
                      <span className="text-sm font-medium">
                        Week {week.weekNumber}
                        {isCurrent && (
                          <Badge color="accent" className="ml-2">current</Badge>
                        )}
                      </span>
                      <p className="text-xs text-text-secondary">{week.theme}</p>
                    </div>
                  </div>
                  {totalCount > 0 && (
                    <span className="text-xs font-mono text-text-secondary">
                      {completedCount}/{totalCount}
                    </span>
                  )}
                </button>

                {expanded && (
                  <div className="px-4 pb-4 border-t border-border pt-3">
                    {/* Objectives */}
                    <div className="space-y-2 mb-4">
                      {week.objectives.map((obj) => (
                        <div key={obj.id} className="flex items-center gap-2 group">
                          <button
                            onClick={() => toggleObjective(week.weekNumber, obj.id, !obj.done)}
                            className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                              obj.done
                                ? "bg-success border-success text-white"
                                : "border-border hover:border-accent"
                            }`}
                          >
                            {obj.done && <span className="text-xs">✓</span>}
                          </button>
                          <span
                            className={`text-sm flex-1 ${
                              obj.done ? "line-through text-text-secondary" : ""
                            }`}
                          >
                            {obj.text}
                          </span>
                          <button
                            onClick={() => removeObjective(week.weekNumber, obj.id)}
                            className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger transition-opacity"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add Objective */}
                    {addingObjective === week.weekNumber ? (
                      <div className="flex items-center gap-2">
                        <Input
                          value={newObjectiveText}
                          onChange={setNewObjectiveText}
                          placeholder="New objective..."
                          className="flex-1"
                        />
                        <Button size="sm" onClick={() => addObjective(week.weekNumber)}>
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingObjective(null);
                            setNewObjectiveText("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingObjective(week.weekNumber)}
                        className="flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors"
                      >
                        <Plus size={12} /> Add objective
                      </button>
                    )}

                    {/* Reflections */}
                    <div className="mt-4">
                      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wider">
                        Reflections
                      </p>
                      <Textarea
                        value={week.reflections}
                        onChange={(v) => updateReflections(week.weekNumber, v)}
                        placeholder="What happened this week? What did you learn?"
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
