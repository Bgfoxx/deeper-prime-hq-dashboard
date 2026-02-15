"use client";

import { useTodayAgenda, useAgenda } from "@/lib/hooks";
import { Card, Badge, Button, Skeleton } from "@/components/ui";
import { Calendar, ClipboardList, Send, Check, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const priorityColor: Record<string, string> = {
  high: "bg-danger",
  medium: "bg-warning",
  low: "bg-text-secondary",
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AgendaPage() {
  const { date, agendaEntry, tasks, events, loading, refetch, sendToTelegram } =
    useTodayAgenda();
  const { entries: allEntries } = useAgenda();
  const [sending, setSending] = useState(false);

  const todayLabel = date
    ? new Date(date + "T12:00:00").toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const isSent = agendaEntry?.sentToTelegram ?? false;

  const handleSend = async () => {
    setSending(true);
    try {
      await sendToTelegram();
      toast.success("Agenda sent to Telegram");
      await refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSending(false);
    }
  };

  // Past agendas: all entries except today, sorted newest-first
  const pastAgendas = allEntries
    .filter((e) => e.date !== date && e.apolloNotes)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl text-text-primary">
            Daily Agenda
          </h1>
          <p className="text-text-secondary text-sm mt-1 font-mono">
            {todayLabel}
          </p>
        </div>
        <Button
          onClick={handleSend}
          disabled={sending || isSent}
          variant={isSent ? "secondary" : "primary"}
          size="md"
        >
          {isSent ? (
            <>
              <Check size={16} className="mr-2" />
              Sent
            </>
          ) : sending ? (
            "Sending..."
          ) : (
            <>
              <Send size={16} className="mr-2" />
              Send to Telegram
            </>
          )}
        </Button>
      </div>

      {/* Meetings Card */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <Calendar size={18} className="text-accent" />
          <h2 className="font-heading text-lg text-text-primary">Meetings</h2>
          <Badge color="muted">{events.length}</Badge>
        </div>
        {events.length === 0 ? (
          <p className="text-text-secondary text-sm italic">
            No meetings today
          </p>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-3 py-2 border-b border-border last:border-0"
              >
                <span className="font-mono text-sm text-text-secondary whitespace-nowrap mt-0.5">
                  {event.allDay
                    ? "All day"
                    : `${formatTime(event.start)} – ${formatTime(event.end)}`}
                </span>
                <div>
                  <p className="text-text-primary text-sm">{event.title}</p>
                  {event.location && (
                    <p className="text-text-secondary text-xs mt-0.5">
                      {event.location}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Tasks Card */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <ClipboardList size={18} className="text-accent" />
          <h2 className="font-heading text-lg text-text-primary">Tasks</h2>
          <Badge color="muted">{tasks.length}</Badge>
        </div>
        {tasks.length === 0 ? (
          <p className="text-text-secondary text-sm italic">
            No tasks for today
          </p>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`flex items-center gap-3 py-2 border-b border-border last:border-0 ${
                  task.status === "done" ? "opacity-50" : ""
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    priorityColor[task.priority] || "bg-text-secondary"
                  }`}
                />
                <span
                  className={`text-sm text-text-primary flex-1 ${
                    task.status === "done" ? "line-through" : ""
                  }`}
                >
                  {task.title}
                </span>
                <Badge color="muted">{task.category}</Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Apollo's Notes Card */}
      <Card className="border-l-2 border-l-accent">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-accent" />
          <h2 className="font-heading text-lg text-text-primary">
            Apollo&apos;s Notes
          </h2>
          {isSent && <Badge color="success">sent to telegram</Badge>}
        </div>
        {agendaEntry?.apolloNotes ? (
          <div className="prose prose-invert prose-sm max-w-none text-text-secondary [&_strong]:text-text-primary [&_h1]:text-text-primary [&_h2]:text-text-primary [&_h3]:text-text-primary [&_a]:text-accent">
            <ReactMarkdown>{agendaEntry.apolloNotes}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-text-secondary text-sm italic">
            No notes from Apollo yet today
          </p>
        )}
      </Card>

      {/* Past Agendas */}
      {pastAgendas.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-border">
          <h2 className="font-heading text-lg text-text-primary">
            Past Agendas
          </h2>
          {pastAgendas.map((entry) => {
            const entryLabel = new Date(
              entry.date + "T12:00:00"
            ).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            });
            return (
              <div key={entry.id}>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-mono text-text-secondary">
                    {entryLabel}
                  </p>
                  {entry.sentToTelegram && (
                    <Badge color="success">sent</Badge>
                  )}
                </div>
                <Card className="border-l-2 border-l-accent">
                  <div className="prose prose-invert prose-sm max-w-none text-text-secondary [&_strong]:text-text-primary [&_h1]:text-text-primary [&_h2]:text-text-primary [&_h3]:text-text-primary [&_a]:text-accent">
                    <ReactMarkdown>{entry.apolloNotes}</ReactMarkdown>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
