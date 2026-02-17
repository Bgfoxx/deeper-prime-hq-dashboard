"use client";

import { useState, useEffect, useCallback } from "react";

/** Returns today's date as YYYY-MM-DD in the local timezone. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function useData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to fetch ${url}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData, setData };
}

// Sprint
interface SprintData {
  currentSprint: {
    name: string;
    startDate: string;
    endDate: string;
    vision: string;
    successMetrics: Array<{
      id: string;
      metric: string;
      current?: number;
      target?: number;
      status?: string;
    }>;
    weeks: Array<{
      weekNumber: number;
      startDate: string;
      theme: string;
      objectives: Array<{ id: string; text: string; done: boolean }>;
      reflections: string;
    }>;
  } | null;
  pastSprints: unknown[];
  lastModified: string;
}

export function useSprint() {
  const { data, loading, error, refetch } = useData<SprintData>("/api/sprint");

  const updateSprint = async (updates: Partial<SprintData>) => {
    const res = await fetch("/api/sprint", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error("Failed to update sprint");
    await refetch();
  };

  return { sprint: data, loading, error, refetch, updateSprint };
}

// Tasks
export interface Task {
  id: string;
  title: string;
  date: string;
  priority: "high" | "medium" | "low";
  status: "todo" | "in-progress" | "done";
  category: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

interface TasksData {
  tasks: Task[];
  lastModified: string;
}

export function useTasks() {
  const { data, loading, error, refetch } = useData<TasksData>("/api/tasks");

  const addTask = async (task: Omit<Task, "id" | "createdAt" | "completedAt">) => {
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(task),
    });
    if (!res.ok) throw new Error("Failed to add task");
    await refetch();
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    const res = await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update task");
    await refetch();
  };

  const deleteTask = async (id: string) => {
    const res = await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete task");
    await refetch();
  };

  return { tasks: data?.tasks ?? [], loading, error, refetch, addTask, updateTask, deleteTask };
}

// Kanban
export interface KanbanCard {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  labels: string[];
  apolloNotes: string;
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

interface KanbanData {
  columns: KanbanColumn[];
  archive: KanbanCard[];
  lastModified: string;
}

export function useKanban() {
  const { data, loading, error, refetch } = useData<KanbanData>("/api/kanban");

  const addCard = async (columnId: string, card: Omit<KanbanCard, "id" | "createdAt" | "updatedAt">) => {
    const res = await fetch("/api/kanban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId, ...card }),
    });
    if (!res.ok) throw new Error("Failed to add card");
    await refetch();
  };

  const updateCard = async (cardId: string, updates: Partial<KanbanCard>) => {
    const res = await fetch("/api/kanban", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update card");
    await refetch();
  };

  const moveCard = async (cardId: string, fromColumn: string, toColumn: string, toIndex: number) => {
    const res = await fetch("/api/kanban", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cardId, fromColumn, toColumn, toIndex, action: "move" }),
    });
    if (!res.ok) throw new Error("Failed to move card");
    await refetch();
  };

  const archiveCard = async (cardId: string, columnId: string) => {
    const res = await fetch(`/api/kanban?cardId=${cardId}&columnId=${columnId}&action=archive`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to archive card");
    await refetch();
  };

  return {
    columns: data?.columns ?? [],
    archive: data?.archive ?? [],
    loading,
    error,
    refetch,
    addCard,
    updateCard,
    moveCard,
    archiveCard,
  };
}

// Content Pipeline
export interface ContentPiece {
  id: string;
  title: string;
  angle: string;
  stage: "idea" | "researching" | "drafting" | "ready" | "published";
  formats: {
    linkedin: { status: string; publishDate: string | null; url: string };
    youtube: { status: string; publishDate: string | null; url: string };
    email: { status: string; publishDate: string | null; url: string };
  };
  coreIdea: string;
  notes: string;
  weekNumber: number;
  createdAt: string;
}

export interface ContentAngle {
  id: string;
  name: string;
  color: string;
}

interface ContentData {
  content: ContentPiece[];
  angles: ContentAngle[];
  lastModified: string;
}

export function useContent() {
  const { data, loading, error, refetch } = useData<ContentData>("/api/content");

  const addContent = async (piece: Partial<ContentPiece>) => {
    const res = await fetch("/api/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(piece),
    });
    if (!res.ok) throw new Error("Failed to add content");
    await refetch();
  };

  const updateContent = async (id: string, updates: Partial<ContentPiece>) => {
    const res = await fetch("/api/content", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update content");
    await refetch();
  };

  const deleteContent = async (id: string) => {
    const res = await fetch(`/api/content?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete content");
    await refetch();
  };

  return {
    content: data?.content ?? [],
    angles: data?.angles ?? [],
    loading,
    error,
    refetch,
    addContent,
    updateContent,
    deleteContent,
  };
}

// Memory Log
export interface MemoryEntry {
  id: string;
  date: string;
  author: "apollo" | "ivan";
  type: "daily-summary" | "decision" | "learning" | "memory-update" | "manual-note";
  title: string;
  content: string;
  tags: string[];
  relatedTo?: string;
  createdAt: string;
}

interface MemoryData {
  entries: MemoryEntry[];
  lastModified: string;
}

export function useMemory() {
  const { data, loading, error, refetch } = useData<MemoryData>("/api/memory");

  const addEntry = async (entry: Omit<MemoryEntry, "id" | "createdAt">) => {
    const res = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!res.ok) throw new Error("Failed to add entry");
    await refetch();
  };

  const updateEntry = async (id: string, updates: Partial<MemoryEntry>) => {
    const res = await fetch("/api/memory", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update entry");
    await refetch();
  };

  const deleteEntry = async (id: string) => {
    const res = await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete entry");
    await refetch();
  };

  return {
    entries: data?.entries ?? [],
    loading,
    error,
    refetch,
    addEntry,
    updateEntry,
    deleteEntry,
  };
}

// Analytics
export interface AnalyticsPlatform {
  name: string;
  entries: Array<Record<string, unknown>>;
}

interface AnalyticsData {
  platforms: Record<string, AnalyticsPlatform>;
  lastModified: string;
}

export function useAnalytics() {
  const { data, loading, error, refetch } = useData<AnalyticsData>("/api/analytics");

  const addEntry = async (platform: string, entry: Record<string, unknown>) => {
    const res = await fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ platform, entry }),
    });
    if (!res.ok) throw new Error("Failed to add analytics entry");
    await refetch();
  };

  return {
    platforms: data?.platforms ?? {},
    loading,
    error,
    refetch,
    addEntry,
  };
}

// Calendar
export interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  location: string;
}

export function useCalendarStatus() {
  const { data, loading, refetch } = useData<{
    connected: boolean;
    source: "apple" | "google" | "none";
    cachedAt?: string;
  }>("/api/calendar/status");
  return {
    connected: data?.connected ?? false,
    source: data?.source ?? "none",
    cachedAt: data?.cachedAt,
    loading,
    refetch,
  };
}

export function useCalendar(start: string, end: string) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!start || !end) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/calendar/events?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`);
      if (!res.ok) throw new Error("Failed to fetch calendar events");
      const json = await res.json();
      setEvents(json.events ?? []);
      setConnected(json.connected ?? false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [start, end]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, connected, loading, error, refetch: fetchEvents };
}

// Agenda
export interface AgendaEntry {
  id: string;
  date: string;
  apolloNotes: string;
  sentToTelegram: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgendaData {
  entries: AgendaEntry[];
  lastModified: string;
}

export function useAgenda() {
  const { data, loading, error, refetch } = useData<AgendaData>("/api/agenda");

  const upsertEntry = async (body: { date?: string; apolloNotes: string }) => {
    const res = await fetch("/api/agenda", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Failed to upsert agenda entry");
    await refetch();
  };

  const updateEntry = async (id: string, updates: Partial<AgendaEntry>) => {
    const res = await fetch("/api/agenda", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    if (!res.ok) throw new Error("Failed to update agenda entry");
    await refetch();
  };

  return {
    entries: data?.entries ?? [],
    loading,
    error,
    refetch,
    upsertEntry,
    updateEntry,
  };
}

interface TodayAgendaData {
  date: string;
  agendaEntry: AgendaEntry | null;
  tasks: Array<{
    id: string;
    title: string;
    date: string;
    priority: "high" | "medium" | "low";
    status: string;
    category: string;
    notes: string;
  }>;
  events: Array<{
    id: string;
    title: string;
    start: string;
    end: string;
    allDay: boolean;
    location: string;
  }>;
}

export function useTodayAgenda() {
  const { data, loading, error, refetch } = useData<TodayAgendaData>("/api/agenda/today");

  const sendToTelegram = async () => {
    const res = await fetch("/api/agenda/send", { method: "POST" });
    if (!res.ok) {
      const json = await res.json();
      throw new Error(json.error || "Failed to send to Telegram");
    }
    await refetch();
    return res.json();
  };

  return {
    date: data?.date ?? "",
    agendaEntry: data?.agendaEntry ?? null,
    tasks: data?.tasks ?? [],
    events: data?.events ?? [],
    loading,
    error,
    refetch,
    sendToTelegram,
  };
}

// Docs
export interface Doc {
  id: string;
  filename: string;
  title: string;
  category: string;
  description: string;
  addedAt: string;
  lastModified: string;
}

interface DocsData {
  docs: Doc[];
  lastModified: string;
}

export function useDocs() {
  const { data, loading, error, refetch } = useData<DocsData>("/api/docs");

  const addDoc = async (doc: Omit<Doc, "id" | "addedAt" | "lastModified">, content: string) => {
    const res = await fetch("/api/docs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...doc, content }),
    });
    if (!res.ok) throw new Error("Failed to add doc");
    await refetch();
  };

  const getDocContent = async (filename: string): Promise<string> => {
    const res = await fetch(`/api/docs?filename=${encodeURIComponent(filename)}`);
    if (!res.ok) return "";
    const json = await res.json();
    return json.content ?? "";
  };

  return {
    docs: data?.docs ?? [],
    loading,
    error,
    refetch,
    addDoc,
    getDocContent,
  };
}
