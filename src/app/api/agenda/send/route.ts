import { NextResponse } from "next/server";
import { readJsonFile, mergeAndWrite } from "@/lib/data";
import { fetchCalendarEvents } from "@/lib/calendar";
import { randomUUID } from "crypto";

interface Task {
  id: string;
  title: string;
  date: string;
  priority: string;
  status: string;
  category: string;
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

interface AgendaData {
  entries: AgendaEntry[];
  lastModified: string;
}

function escapeMarkdownV2(text: string): string {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function buildTelegramMessage(
  tasks: Task[],
  events: { title: string; start: string; end: string; allDay: boolean; location: string }[],
  apolloNotes: string,
  date: string
): string {
  const lines: string[] = [];

  const dateLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  lines.push(`*${escapeMarkdownV2("Daily Agenda — " + dateLabel)}*`);
  lines.push("");

  // Meetings
  lines.push(`*${escapeMarkdownV2("Meetings")}*`);
  if (events.length === 0) {
    lines.push(escapeMarkdownV2("No meetings today."));
  } else {
    for (const event of events) {
      if (event.allDay) {
        lines.push(`${escapeMarkdownV2("• " + event.title + " (all day)")}`);
      } else {
        const startTime = new Date(event.start).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const endTime = new Date(event.end).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        let line = `• ${startTime} – ${endTime}: ${event.title}`;
        if (event.location) line += ` (${event.location})`;
        lines.push(escapeMarkdownV2(line));
      }
    }
  }
  lines.push("");

  // Tasks
  lines.push(`*${escapeMarkdownV2("Tasks")}*`);
  if (tasks.length === 0) {
    lines.push(escapeMarkdownV2("No tasks for today."));
  } else {
    const priorityEmoji: Record<string, string> = { high: "🔴", medium: "🟡", low: "⚪" };
    for (const task of tasks) {
      const emoji = priorityEmoji[task.priority] || "⚪";
      const done = task.status === "done" ? " ✅" : "";
      lines.push(escapeMarkdownV2(`${emoji} ${task.title}${done}`));
    }
  }
  lines.push("");

  // Apollo's Notes
  if (apolloNotes) {
    lines.push(`*${escapeMarkdownV2("Apollo's Notes")}*`);
    lines.push(escapeMarkdownV2(apolloNotes));
  }

  return lines.join("\n");
}

export async function POST() {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    return NextResponse.json(
      { error: "Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.local" },
      { status: 400 }
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();

  // Gather data
  const tasksData = await readJsonFile<{ tasks: Task[] }>("tasks.json");
  const todayTasks = tasksData.tasks.filter((t) => t.date === today);

  let events: { title: string; start: string; end: string; allDay: boolean; location: string }[] = [];
  try {
    const dayStart = `${today}T00:00:00.000Z`;
    const dayEnd = `${today}T23:59:59.999Z`;
    events = await fetchCalendarEvents(dayStart, dayEnd);
  } catch {
    // Calendar not connected
  }

  const agendaData = await readJsonFile<AgendaData>("agenda.json");
  const existingEntry = agendaData.entries.find((e) => e.date === today);
  const apolloNotes = existingEntry?.apolloNotes || "";

  // Build and send message
  const message = buildTelegramMessage(todayTasks, events, apolloNotes, today);

  const telegramRes = await fetch(
    `https://api.telegram.org/bot${botToken}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "MarkdownV2",
      }),
    }
  );

  if (!telegramRes.ok) {
    const err = await telegramRes.text();
    return NextResponse.json(
      { error: "Failed to send Telegram message", details: err },
      { status: 500 }
    );
  }

  // Mark as sent (or create entry if none existed)
  await mergeAndWrite<AgendaData>("agenda.json", (current) => {
    const exists = current.entries.find((e) => e.date === today);
    if (exists) {
      return {
        ...current,
        entries: current.entries.map((e) =>
          e.date === today
            ? { ...e, sentToTelegram: true, sentAt: now, updatedAt: now }
            : e
        ),
      };
    }
    return {
      ...current,
      entries: [
        ...current.entries,
        {
          id: randomUUID(),
          date: today,
          apolloNotes: "",
          sentToTelegram: true,
          sentAt: now,
          createdAt: now,
          updatedAt: now,
        },
      ],
    };
  });

  return NextResponse.json({ success: true, sentAt: now });
}
