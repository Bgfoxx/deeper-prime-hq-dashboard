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

  // Fetch tasks for today
  const tasksData = await readJsonFile<{ tasks: Task[] }>("tasks.json");
  const todayTasks = tasksData.tasks.filter((t) => t.date === today);

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
