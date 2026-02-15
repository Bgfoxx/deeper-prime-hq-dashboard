"use client";

import { useSprint, useTasks, useContent, useKanban, useMemory } from "@/lib/hooks";
import { Card, Badge, Button, ProgressBar, Skeleton } from "@/components/ui";
import { Plus, Target, CheckSquare, Bot, Newspaper, BookOpen } from "lucide-react";
import Link from "next/link";

export default function Dashboard() {
  const { sprint, loading: sprintLoading } = useSprint();
  const { tasks, loading: tasksLoading } = useTasks();
  const { content, loading: contentLoading } = useContent();
  const { columns, loading: kanbanLoading } = useKanban();
  const { entries: memoryEntries, loading: memoryLoading } = useMemory();

  const today = new Date().toISOString().split("T")[0];
  const todayTasks = tasks.filter((t) => t.date === today && t.status !== "done");
  const completedToday = tasks.filter((t) => t.date === today && t.status === "done");

  // Sprint progress
  const currentSprint = sprint?.currentSprint;
  let sprintDay = 0;
  let sprintTotal = 90;
  let currentWeek: { weekNumber: number; startDate: string; theme: string; objectives: { id: string; text: string; done: boolean }[]; reflections: string } | null = null;

  if (currentSprint) {
    const start = new Date(currentSprint.startDate);
    const end = new Date(currentSprint.endDate);
    const now = new Date();
    sprintTotal = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    sprintDay = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    sprintDay = Math.min(sprintDay, sprintTotal);

    // Find current week
    const weekNum = Math.ceil(sprintDay / 7);
    currentWeek = currentSprint.weeks.find((w) => w.weekNumber === weekNum) ?? currentSprint.weeks[0];
  }

  // Content pipeline counts
  const stages = ["idea", "researching", "drafting", "ready", "published"];
  const stageCounts = stages.map((s) => ({
    stage: s,
    count: content.filter((c) => c.stage === s).length,
  }));

  // Apollo active tasks
  const inProgressCards = columns.find((c) => c.id === "in-progress")?.cards ?? [];

  // Latest memory entry from Apollo
  const latestApolloEntry = [...memoryEntries]
    .filter((e) => e.author === "apollo")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  const loading = sprintLoading || tasksLoading || contentLoading || kanbanLoading || memoryLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-3 gap-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Dashboard</h1>
          <p className="text-text-secondary text-sm mt-1 font-mono">{today}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/tasks">
            <Button variant="secondary" size="sm">
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Task
              </span>
            </Button>
          </Link>
          <Link href="/content">
            <Button variant="secondary" size="sm">
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Content Idea
              </span>
            </Button>
          </Link>
          <Link href="/memory">
            <Button variant="secondary" size="sm">
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Memory Entry
              </span>
            </Button>
          </Link>
        </div>
      </div>

      {/* Sprint Progress */}
      {currentSprint && (
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Target size={18} className="text-accent" />
                <h2 className="font-heading text-lg">{currentSprint.name}</h2>
              </div>
              <p className="text-text-secondary text-sm">{currentSprint.vision}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-2xl text-accent">{sprintDay}</p>
              <p className="text-xs text-text-secondary">of {sprintTotal} days</p>
            </div>
          </div>
          <ProgressBar value={sprintDay} max={sprintTotal} />

          {/* Current week objectives */}
          {currentWeek && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-sm font-medium mb-2">
                Week {currentWeek.weekNumber}: {currentWeek.theme}
              </p>
              <div className="space-y-1.5">
                {currentWeek.objectives.map((obj) => (
                  <div key={obj.id} className="flex items-center gap-2 text-sm">
                    <div
                      className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center ${
                        obj.done
                          ? "bg-success border-success text-white"
                          : "border-border"
                      }`}
                    >
                      {obj.done && <span className="text-xs">✓</span>}
                    </div>
                    <span className={obj.done ? "line-through text-text-secondary" : ""}>
                      {obj.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Today's Tasks */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare size={18} className="text-accent" />
              <h3 className="font-heading text-base">Today&apos;s Tasks</h3>
            </div>
            <Badge color="accent">{todayTasks.length} todo</Badge>
          </div>
          {todayTasks.length === 0 && completedToday.length === 0 ? (
            <p className="text-sm text-text-secondary">No tasks for today</p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <div
                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      task.priority === "high"
                        ? "bg-accent"
                        : task.priority === "low"
                          ? "bg-text-secondary"
                          : "bg-border"
                    }`}
                  />
                  <span className="truncate">{task.title}</span>
                </div>
              ))}
              {completedToday.length > 0 && (
                <p className="text-xs text-success mt-2">
                  {completedToday.length} completed today
                </p>
              )}
            </div>
          )}
        </Card>

        {/* Content Pipeline */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={18} className="text-accent" />
            <h3 className="font-heading text-base">Content Pipeline</h3>
          </div>
          <div className="space-y-2">
            {stageCounts.map((s) => (
              <div key={s.stage} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary capitalize">{s.stage}</span>
                <Badge color={s.count > 0 ? "accent" : "muted"}>{s.count}</Badge>
              </div>
            ))}
          </div>
        </Card>

        {/* Apollo Activity */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bot size={18} className="text-accent" />
            <h3 className="font-heading text-base">Apollo Active</h3>
          </div>
          {inProgressCards.length === 0 ? (
            <p className="text-sm text-text-secondary">No tasks in progress</p>
          ) : (
            <div className="space-y-2">
              {inProgressCards.slice(0, 3).map((card) => (
                <div key={card.id} className="text-sm">
                  <p className="truncate">{card.title}</p>
                  {card.apolloNotes && (
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      {card.apolloNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Latest Memory Entry */}
      {latestApolloEntry && (
        <Card>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen size={18} className="text-accent" />
            <h3 className="font-heading text-base">Latest from Apollo</h3>
            <Badge color="accent">{latestApolloEntry.type}</Badge>
          </div>
          <h4 className="text-sm font-medium mb-1">{latestApolloEntry.title}</h4>
          <p className="text-sm text-text-secondary line-clamp-3">
            {latestApolloEntry.content}
          </p>
          <Link href="/memory" className="text-xs text-accent mt-2 inline-block hover:underline">
            View all entries →
          </Link>
        </Card>
      )}
    </div>
  );
}
