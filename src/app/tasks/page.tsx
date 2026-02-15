"use client";

import { useTasks, Task } from "@/lib/hooks";
import { Card, Badge, Button, Input, Select, Skeleton, EmptyState } from "@/components/ui";
import { Plus, CheckSquare, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categories = ["deeper-prime", "personal", "work", "health"];
const priorities = ["high", "medium", "low"];

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const [view, setView] = useState<"today" | "week">("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "medium" as Task["priority"],
    category: "deeper-prime",
    date: new Date().toISOString().split("T")[0],
  });

  const today = new Date().toISOString().split("T")[0];

  // Get date range for this week
  const getWeekDates = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const weekRange = getWeekDates();

  // Filter tasks
  let filteredTasks = tasks;
  if (view === "today") {
    filteredTasks = tasks.filter((t) => t.date === today);
  } else {
    filteredTasks = tasks.filter((t) => t.date >= weekRange.start && t.date <= weekRange.end);
  }

  if (filterCategory !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.category === filterCategory);
  }

  const activeTasks = filteredTasks.filter((t) => t.status !== "done");
  const completedTasks = filteredTasks.filter((t) => t.status === "done");

  // Group by category
  const grouped = categories.reduce(
    (acc, cat) => {
      const catTasks = activeTasks.filter((t) => t.category === cat);
      if (catTasks.length > 0) acc[cat] = catTasks;
      return acc;
    },
    {} as Record<string, Task[]>
  );

  // Check for overdue
  const isOverdue = (task: Task) => task.date < today && task.status !== "done";

  const priorityColors: Record<string, string> = {
    high: "border-l-accent",
    medium: "border-l-border",
    low: "border-l-text-secondary/30",
  };

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return;
    await addTask({
      title: newTask.title,
      date: newTask.date,
      priority: newTask.priority,
      status: "todo",
      category: newTask.category,
      notes: "",
    });
    setNewTask({
      title: "",
      priority: "medium",
      category: "deeper-prime",
      date: new Date().toISOString().split("T")[0],
    });
    setShowAddForm(false);
    toast.success("Task added");
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
    toast.success(newStatus === "done" ? "Task completed" : "Task reopened");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12" />
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Tasks</h1>
        <Button onClick={() => setShowAddForm(!showAddForm)}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> New Task
          </span>
        </Button>
      </div>

      {/* Quick Add Form */}
      {showAddForm && (
        <Card>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <Input
                value={newTask.title}
                onChange={(v) => setNewTask({ ...newTask, title: v })}
                placeholder="What needs to be done?"
              />
            </div>
            <Select
              value={newTask.priority}
              onChange={(v) => setNewTask({ ...newTask, priority: v as Task["priority"] })}
              options={priorities.map((p) => ({ value: p, label: p }))}
            />
            <Select
              value={newTask.category}
              onChange={(v) => setNewTask({ ...newTask, category: v })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <input
              type="date"
              value={newTask.date}
              onChange={(e) => setNewTask({ ...newTask, date: e.target.value })}
              className="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            />
            <Button onClick={handleAddTask}>Add</Button>
          </div>
        </Card>
      )}

      {/* View Toggle & Filters */}
      <div className="flex items-center gap-3">
        <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setView("today")}
            className={`px-4 py-2 text-sm transition-colors ${
              view === "today" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setView("week")}
            className={`px-4 py-2 text-sm transition-colors ${
              view === "week" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            This Week
          </button>
        </div>

        <div className="flex gap-1">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
              filterCategory === "all" ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${
                filterCategory === cat ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      {activeTasks.length === 0 && completedTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare size={48} />}
          title="No tasks yet"
          description={`Add your first task for ${view === "today" ? "today" : "this week"}`}
          action={
            <Button onClick={() => setShowAddForm(true)}>
              <span className="flex items-center gap-1.5">
                <Plus size={14} /> Add Task
              </span>
            </Button>
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([category, catTasks]) => (
            <div key={category}>
              <h3 className="text-xs uppercase tracking-wider text-text-secondary mb-2">
                {category}
              </h3>
              <div className="space-y-1">
                {catTasks
                  .sort((a, b) => {
                    const p = { high: 0, medium: 1, low: 2 };
                    return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
                  })
                  .map((task) => (
                    <div
                      key={task.id}
                      className={`flex items-center gap-3 p-3 bg-surface rounded-lg border-l-2 ${
                        priorityColors[task.priority]
                      } ${isOverdue(task) ? "ring-1 ring-danger/30" : ""} group`}
                    >
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
                          task.status === "done"
                            ? "bg-success border-success text-white"
                            : "border-border hover:border-accent"
                        }`}
                      >
                        {task.status === "done" && <span className="text-xs">✓</span>}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-text-secondary">{task.date}</span>
                          {isOverdue(task) && <Badge color="danger">overdue</Badge>}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          deleteTask(task.id);
                          toast.success("Task deleted");
                        }}
                        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          ))}

          {/* Completed */}
          {completedTasks.length > 0 && (
            <div>
              <button
                onClick={() => setShowCompleted(!showCompleted)}
                className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform ${showCompleted ? "" : "-rotate-90"}`}
                />
                {completedTasks.length} completed
              </button>
              {showCompleted && (
                <div className="space-y-1 mt-2">
                  {completedTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 bg-surface/50 rounded-lg opacity-60 group"
                    >
                      <button
                        onClick={() => handleToggleStatus(task)}
                        className="w-5 h-5 rounded bg-success border-success text-white flex-shrink-0 flex items-center justify-center"
                      >
                        <span className="text-xs">✓</span>
                      </button>
                      <span className="text-sm line-through text-text-secondary flex-1">
                        {task.title}
                      </span>
                      <button
                        onClick={() => {
                          deleteTask(task.id);
                          toast.success("Task deleted");
                        }}
                        className="opacity-0 group-hover:opacity-100 text-text-secondary hover:text-danger transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
