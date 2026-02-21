"use client";

import { useTasks, Task, localToday } from "@/lib/hooks";
import { Card, Badge, Button, Input, Select, Skeleton, EmptyState } from "@/components/ui";
import { Plus, CheckSquare, ChevronDown, ChevronLeft, ChevronRight, Trash2, Pencil, X, Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const categories = ["deeper-prime", "personal", "work", "health"];
const priorities = ["high", "medium", "low"];

type View = "today" | "week" | "history";

interface EditForm {
  title: string;
  priority: Task["priority"];
  category: string;
  date: string;
  notes: string;
}

export default function TasksPage() {
  const { tasks, loading, addTask, updateTask, deleteTask } = useTasks();
  const [view, setView] = useState<View>("today");
  const [showCompleted, setShowCompleted] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: "",
    priority: "medium",
    category: "deeper-prime",
    date: localToday(),
    notes: "",
  });
  const [newTask, setNewTask] = useState({
    title: "",
    priority: "medium" as Task["priority"],
    category: "deeper-prime",
    date: localToday(),
  });

  const today = localToday();

  const getWeekDates = (offset: number = 0) => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + offset * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().split("T")[0],
      end: sunday.toISOString().split("T")[0],
    };
  };

  const weekRange = getWeekDates(weekOffset);

  const formatWeekLabel = () => {
    const fmt = (d: string) => {
      const date = new Date(d + "T00:00:00");
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };
    return `${fmt(weekRange.start)} – ${fmt(weekRange.end)}`;
  };

  // Filter tasks per view
  let filteredTasks = tasks;
  if (view === "today") {
    filteredTasks = tasks.filter((t) => t.date === today || (t.date < today && t.status !== "done"));
  } else if (view === "week") {
    filteredTasks = tasks.filter((t) => t.date >= weekRange.start && t.date <= weekRange.end);
  } else {
    // history: all completed tasks
    filteredTasks = tasks.filter((t) => t.status === "done");
  }

  if (filterCategory !== "all") {
    filteredTasks = filteredTasks.filter((t) => t.category === filterCategory);
  }

  const activeTasks = view === "history" ? [] : filteredTasks.filter((t) => t.status !== "done");
  const completedTasks = view === "history"
    ? filteredTasks.slice().sort((a, b) => {
        const aDate = a.completedAt || a.createdAt;
        const bDate = b.completedAt || b.createdAt;
        return bDate.localeCompare(aDate);
      })
    : filteredTasks.filter((t) => t.status === "done");

  // Group active tasks by category
  const grouped = categories.reduce(
    (acc, cat) => {
      const catTasks = activeTasks.filter((t) => t.category === cat);
      if (catTasks.length > 0) acc[cat] = catTasks;
      return acc;
    },
    {} as Record<string, Task[]>
  );
  // Tasks with unknown category (e.g. Apollo-created with defaults applied)
  const knownCategories = new Set(categories);
  const uncategorized = activeTasks.filter((t) => !knownCategories.has(t.category));
  if (uncategorized.length > 0) grouped["other"] = uncategorized;

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
    setNewTask({ title: "", priority: "medium", category: "deeper-prime", date: localToday() });
    setShowAddForm(false);
    toast.success("Task added");
  };

  const handleToggleStatus = async (task: Task) => {
    const newStatus = task.status === "done" ? "todo" : "done";
    await updateTask(task.id, { status: newStatus });
    toast.success(newStatus === "done" ? "Task completed" : "Task reopened");
  };

  const handleEditStart = (task: Task) => {
    setEditingTaskId(task.id);
    setEditForm({
      title: task.title,
      priority: task.priority,
      category: task.category,
      date: task.date,
      notes: task.notes || "",
    });
  };

  const handleEditSave = async () => {
    if (!editingTaskId || !editForm.title.trim()) return;
    await updateTask(editingTaskId, editForm);
    setEditingTaskId(null);
    toast.success("Task updated");
  };

  const handleEditCancel = () => setEditingTaskId(null);

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

  const TaskRow = ({ task, strikethrough = false }: { task: Task; strikethrough?: boolean }) => {
    const isEditing = editingTaskId === task.id;

    if (isEditing) {
      return (
        <div className="p-3 bg-surface rounded-lg border border-accent/40 space-y-3">
          <Input
            value={editForm.title}
            onChange={(v) => setEditForm({ ...editForm, title: v })}
            placeholder="Task title"
          />
          <div className="flex flex-wrap gap-2 items-center">
            <Select
              value={editForm.priority}
              onChange={(v) => setEditForm({ ...editForm, priority: v as Task["priority"] })}
              options={priorities.map((p) => ({ value: p, label: p }))}
            />
            <Select
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <input
              type="date"
              value={editForm.date}
              onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
              className="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text-primary"
            />
          </div>
          <Input
            value={editForm.notes}
            onChange={(v) => setEditForm({ ...editForm, notes: v })}
            placeholder="Notes (optional)"
          />
          <div className="flex gap-2">
            <button
              onClick={handleEditSave}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
            >
              <Check size={12} /> Save
            </button>
            <button
              onClick={handleEditCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary rounded-lg transition-colors"
            >
              <X size={12} /> Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex items-center gap-3 p-3 rounded-lg group ${
          strikethrough ? "bg-surface/50 opacity-60" : `bg-surface border-l-2 ${priorityColors[task.priority]}`
        } ${isOverdue(task) && !strikethrough ? "ring-1 ring-danger/30" : ""}`}
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
          <p className={`text-sm truncate ${strikethrough ? "line-through text-text-secondary" : ""}`}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-text-secondary">{task.date}</span>
            {isOverdue(task) && <Badge color="danger">overdue</Badge>}
            {task.notes && <span className="text-xs text-text-secondary truncate max-w-[200px]">{task.notes}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!strikethrough && (
            <button
              onClick={() => handleEditStart(task)}
              className="p-1 text-text-secondary hover:text-text-primary rounded transition-colors"
              title="Edit task"
            >
              <Pencil size={13} />
            </button>
          )}
          <button
            onClick={() => { deleteTask(task.id); toast.success("Task deleted"); }}
            className="p-1 text-text-secondary hover:text-danger rounded transition-colors"
            title="Delete task"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    );
  };

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
      <div className="flex items-center gap-3 flex-wrap">
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
            onClick={() => { setView("week"); setWeekOffset(0); }}
            className={`px-4 py-2 text-sm transition-colors ${
              view === "week" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            This Week
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-4 py-2 text-sm transition-colors ${
              view === "history" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
            }`}
          >
            History
          </button>
        </div>

        {view === "week" && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset(weekOffset - 1)}
              className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-xs font-mono text-text-secondary min-w-[130px] text-center">
              {formatWeekLabel()}
            </span>
            <button
              onClick={() => setWeekOffset(weekOffset + 1)}
              className="p-1.5 rounded hover:bg-surface text-text-secondary hover:text-text-primary transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-xs text-accent hover:text-accent-hover ml-1 transition-colors"
              >
                Today
              </button>
            )}
          </div>
        )}

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

      {/* History view */}
      {view === "history" && (
        <div className="space-y-4">
          {completedTasks.length === 0 ? (
            <EmptyState
              icon={<CheckSquare size={48} />}
              title="No completed tasks"
              description="Completed tasks will appear here"
            />
          ) : (
            <>
              <p className="text-xs text-text-secondary">{completedTasks.length} completed task{completedTasks.length !== 1 ? "s" : ""}</p>
              <div className="space-y-1">
                {completedTasks.map((task) => (
                  <TaskRow key={task.id} task={task} strikethrough />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Today / Week task list */}
      {view !== "history" && (
        <>
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
                        const p: Record<string, number> = { high: 0, medium: 1, low: 2 };
                        return (p[a.priority] ?? 1) - (p[b.priority] ?? 1);
                      })
                      .map((task) => (
                        <TaskRow key={task.id} task={task} />
                      ))}
                  </div>
                </div>
              ))}

              {/* Completed section */}
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
                        <TaskRow key={task.id} task={task} strikethrough />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
