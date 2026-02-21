import { NextResponse } from "next/server";
import { readJsonFile } from "@/lib/data";
import { fetchCalendarEvents } from "@/lib/calendar";

interface Task {
  id: string;
  title: string;
  date: string;
  priority: string;
  status: string;
  category: string;
  notes: string;
  createdAt: string;
  completedAt: string | null;
}

interface AgendaEntry {
  id: string;
  date: string;
  apolloNotes: string;
  sentToTelegram: boolean;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export async function GET() {
  const today = new Date().toISOString().split("T")[0];

  // Fetch tasks for today (normalize Apollo-created tasks with done: bool schema)
  const tasksData = await readJsonFile<{ tasks: (Task & { done?: boolean })[] }>("tasks.json");
  const allTasks: Task[] = tasksData.tasks.map((t) => ({
    id: t.id as string,
    title: t.title as string,
    date: t.date as string,
    priority: (t.priority as string) || "medium",
    status: t.status || (t.done === true ? "done" : "todo"),
    category: (t.category as string) || "deeper-prime",
    notes: (t.notes as string) || "",
    createdAt: t.createdAt as string,
    completedAt: (t.completedAt as string) || null,
  }));
  const todayTasks = allTasks.filter((t) => t.date === today && t.status !== "done");

  // Fetch calendar events for today (graceful fallback)
  let events: { id: string; title: string; start: string; end: string; allDay: boolean; location: string }[] = [];
  try {
    const dayStart = `${today}T00:00:00.000Z`;
    const dayEnd = `${today}T23:59:59.999Z`;
    events = await fetchCalendarEvents(dayStart, dayEnd);
  } catch {
    // Calendar not connected — that's fine
  }

  // Fetch agenda entry for today
  const agendaData = await readJsonFile<{ entries: AgendaEntry[] }>("agenda.json");
  const agendaEntry = agendaData.entries.find((e) => e.date === today) || null;

  return NextResponse.json({
    date: today,
    agendaEntry,
    tasks: todayTasks,
    events,
  });
}
