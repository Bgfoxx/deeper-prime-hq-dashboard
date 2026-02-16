"use client";

import { useTasks, useCalendar, useCalendarStatus, CalendarEvent } from "@/lib/hooks";
import { Card, Badge, Button, Skeleton } from "@/components/ui";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Link2, Unlink, MapPin } from "lucide-react";
import { useState, useMemo, useEffect, Suspense } from "react";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

export default function CalendarPage() {
  return (
    <Suspense fallback={<div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-[600px]" /></div>}>
      <CalendarContent />
    </Suspense>
  );
}

function CalendarContent() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { connected, source, cachedAt, loading: statusLoading, refetch: refetchStatus } = useCalendarStatus();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"week" | "day">("week");
  const searchParams = useSearchParams();

  // Handle OAuth callback params
  useEffect(() => {
    if (searchParams.get("connected") === "true") {
      toast.success("Google Calendar connected");
      refetchStatus();
    }
    if (searchParams.get("error")) {
      const err = searchParams.get("error");
      const messages: Record<string, string> = {
        denied: "Calendar connection was denied",
        no_code: "No authorization code received",
        token_exchange_failed: "Failed to connect — please try again",
      };
      toast.error(messages[err!] ?? "Calendar connection failed");
    }
  }, [searchParams, refetchStatus]);

  // Get week dates
  const weekDates = useMemo(() => {
    const dates = [];
    const start = new Date(currentDate);
    const day = start.getDay();
    start.setDate(start.getDate() - (day === 0 ? 6 : day - 1)); // Monday
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate]);

  // Calculate date range for calendar events
  const dateRange = useMemo(() => {
    if (view === "week") {
      const start = new Date(weekDates[0]);
      start.setHours(0, 0, 0, 0);
      const end = new Date(weekDates[6]);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    } else {
      const start = new Date(currentDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(currentDate);
      end.setHours(23, 59, 59, 999);
      return { start: start.toISOString(), end: end.toISOString() };
    }
  }, [view, weekDates, currentDate]);

  const { events: calendarEvents, loading: eventsLoading } = useCalendar(
    dateRange.start,
    dateRange.end
  );

  const today = new Date().toISOString().split("T")[0];

  const navigateWeek = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + direction * 7);
    setCurrentDate(next);
  };

  const navigateDay = (direction: number) => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + direction);
    setCurrentDate(next);
  };

  const handleConnect = async () => {
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
  };

  const handleDisconnect = async () => {
    try {
      await fetch("/api/calendar/disconnect", { method: "POST" });
      toast.success("Google Calendar disconnected");
      refetchStatus();
    } catch {
      toast.error("Failed to disconnect");
    }
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 18 }, (_, i) => i + 6); // 6am to 11pm

  const getTasksForDate = (dateStr: string) =>
    tasks.filter((t) => t.date === dateStr);

  // Get calendar events for a specific date
  const getEventsForDate = (dateStr: string): CalendarEvent[] =>
    calendarEvents.filter((e) => {
      const eventDate = e.start.split("T")[0];
      return eventDate === dateStr;
    });

  // Get timed events for a specific date and hour
  const getEventsForHour = (dateStr: string, hour: number): CalendarEvent[] =>
    calendarEvents.filter((e) => {
      if (e.allDay) return false;
      const eventDate = e.start.split("T")[0];
      if (eventDate !== dateStr) return false;
      const eventHour = new Date(e.start).getHours();
      return eventHour === hour;
    });

  // Get all-day events for a date
  const getAllDayEvents = (dateStr: string): CalendarEvent[] =>
    calendarEvents.filter((e) => {
      if (!e.allDay) return false;
      return e.start === dateStr;
    });

  // Calculate event position and height in the hour grid
  const getEventStyle = (event: CalendarEvent) => {
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);
    const startMinutes = startDate.getMinutes();
    const durationMinutes = (endDate.getTime() - startDate.getTime()) / 60000;
    const top = (startMinutes / 60) * 100;
    const height = Math.max((durationMinutes / 60) * 40, 18); // min 18px, 40px per hour
    return { top: `${top}%`, height: `${height}px` };
  };

  const priorityColors: Record<string, string> = {
    high: "bg-accent/20 border-l-accent text-accent",
    medium: "bg-surface border-l-border text-text-primary",
    low: "bg-surface/50 border-l-text-secondary/30 text-text-secondary",
  };

  const loading = tasksLoading || statusLoading;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Calendar</h1>
        <div className="flex items-center gap-3">
          {source === "google" && (
            <Button variant="ghost" size="sm" onClick={handleDisconnect}>
              <span className="flex items-center gap-1.5">
                <Unlink size={14} /> Disconnect Google
              </span>
            </Button>
          )}
          <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setView("week")}
              className={`px-4 py-2 text-sm transition-colors ${view === "week" ? "bg-accent text-white" : "text-text-secondary"}`}
            >
              Week
            </button>
            <button
              onClick={() => setView("day")}
              className={`px-4 py-2 text-sm transition-colors ${view === "day" ? "bg-accent text-white" : "text-text-secondary"}`}
            >
              Day
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Connection Status */}
      {connected && source === "apple" && (
        <Card className="!p-4 border-success/20 bg-success/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CalendarIcon size={18} className="text-success" />
              <div>
                <p className="text-sm font-medium">Apple Calendar connected</p>
                <p className="text-xs text-text-secondary">
                  {cachedAt
                    ? `Last synced: ${new Date(cachedAt).toLocaleString("en-US", { hour: "numeric", minute: "2-digit", month: "short", day: "numeric" })}`
                    : "Reading directly from Calendar.app"}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}
      {!connected && (
        <Card className="!p-4 border-accent/20 bg-accent/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link2 size={18} className="text-accent" />
              <div>
                <p className="text-sm font-medium">No calendar connected</p>
                <p className="text-xs text-text-secondary">
                  Install icalBuddy to read from Apple Calendar, or connect Google Calendar
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={handleConnect}>
              Connect Google Calendar
            </Button>
          </div>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => (view === "week" ? navigateWeek(-1) : navigateDay(-1))}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => (view === "week" ? navigateWeek(1) : navigateDay(1))}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h2 className="font-heading text-lg ml-2">
            {view === "week"
              ? `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
              : currentDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
          </h2>
          {eventsLoading && (
            <span className="text-xs text-text-secondary ml-2">Loading events...</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCurrentDate(new Date())}
        >
          Today
        </Button>
      </div>

      {/* Calendar Grid */}
      {view === "week" ? (
        <Card className="!p-0 overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-8 border-b border-border">
            <div className="p-2 text-xs text-text-secondary" />
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split("T")[0];
              const isToday = dateStr === today;
              return (
                <div
                  key={i}
                  className={`p-2 text-center border-l border-border ${isToday ? "bg-accent/5" : ""}`}
                >
                  <p className="text-xs text-text-secondary">{dayNames[i]}</p>
                  <p className={`text-sm font-mono ${isToday ? "text-accent font-bold" : ""}`}>
                    {date.getDate()}
                  </p>
                </div>
              );
            })}
          </div>

          {/* All-day events row (Google Calendar) */}
          {calendarEvents.some((e) => e.allDay) && (
            <div className="grid grid-cols-8 border-b border-border min-h-[32px]">
              <div className="p-2 text-xs text-text-secondary flex items-start justify-end pr-3">
                All Day
              </div>
              {weekDates.map((date, i) => {
                const dateStr = date.toISOString().split("T")[0];
                const allDay = getAllDayEvents(dateStr);
                return (
                  <div key={i} className="p-1 border-l border-border space-y-0.5">
                    {allDay.map((event) => (
                      <div
                        key={event.id}
                        className="px-1.5 py-0.5 text-[10px] rounded bg-stone-600/30 border-l-2 border-l-stone-400 text-stone-300 truncate"
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* All-day tasks row */}
          <div className="grid grid-cols-8 border-b border-border min-h-[60px]">
            <div className="p-2 text-xs text-text-secondary flex items-start justify-end pr-3">
              Tasks
            </div>
            {weekDates.map((date, i) => {
              const dateStr = date.toISOString().split("T")[0];
              const dayTasks = getTasksForDate(dateStr);
              return (
                <div key={i} className="p-1 border-l border-border space-y-0.5">
                  {dayTasks.slice(0, 3).map((task) => (
                    <div
                      key={task.id}
                      className={`px-1.5 py-0.5 text-[10px] rounded border-l-2 truncate ${
                        priorityColors[task.priority]
                      } ${task.status === "done" ? "opacity-50 line-through" : ""}`}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > 3 && (
                    <p className="text-[10px] text-text-secondary pl-1">
                      +{dayTasks.length - 3} more
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Hour rows */}
          {hours.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/50 min-h-[40px]">
              <div className="p-1 text-[10px] font-mono text-text-secondary text-right pr-3">
                {hour.toString().padStart(2, "0")}:00
              </div>
              {weekDates.map((date, i) => {
                const dateStr = date.toISOString().split("T")[0];
                const hourEvents = getEventsForHour(dateStr, hour);
                return (
                  <div key={i} className="border-l border-border/50 relative">
                    {hourEvents.map((event) => (
                      <div
                        key={event.id}
                        className="absolute left-0.5 right-0.5 px-1 py-0.5 text-[10px] rounded bg-stone-600/30 border-l-2 border-l-stone-400 text-stone-300 truncate z-10"
                        style={getEventStyle(event)}
                        title={`${event.title}${event.location ? ` — ${event.location}` : ""}`}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      ) : (
        /* Day View */
        <Card className="!p-0 overflow-hidden">
          {/* All-day Google events */}
          {getAllDayEvents(currentDate.toISOString().split("T")[0]).length > 0 && (
            <div className="p-4 border-b border-border">
              <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">All Day</p>
              <div className="space-y-1">
                {getAllDayEvents(currentDate.toISOString().split("T")[0]).map((event) => (
                  <div
                    key={event.id}
                    className="px-3 py-2 rounded bg-stone-600/30 border-l-2 border-l-stone-400 text-stone-300 text-sm flex items-center gap-2"
                  >
                    <CalendarIcon size={12} />
                    {event.title}
                    {event.location && (
                      <span className="text-xs text-stone-400 flex items-center gap-1">
                        <MapPin size={10} /> {event.location}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Day Tasks */}
          <div className="p-4 border-b border-border">
            <p className="text-xs text-text-secondary uppercase tracking-wider mb-2">Tasks</p>
            {getTasksForDate(currentDate.toISOString().split("T")[0]).length === 0 ? (
              <p className="text-sm text-text-secondary">No tasks for this day</p>
            ) : (
              <div className="space-y-1">
                {getTasksForDate(currentDate.toISOString().split("T")[0]).map((task) => (
                  <div
                    key={task.id}
                    className={`px-3 py-2 rounded border-l-2 text-sm ${
                      priorityColors[task.priority]
                    } ${task.status === "done" ? "opacity-50 line-through" : ""}`}
                  >
                    {task.title}
                    <Badge color="muted" className="ml-2">{task.category}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hour grid */}
          {hours.map((hour) => {
            const dateStr = currentDate.toISOString().split("T")[0];
            const hourEvents = getEventsForHour(dateStr, hour);
            return (
              <div key={hour} className="flex border-b border-border/50 min-h-[50px]">
                <div className="w-16 p-2 text-xs font-mono text-text-secondary text-right pr-3 flex-shrink-0">
                  {hour.toString().padStart(2, "0")}:00
                </div>
                <div className="flex-1 border-l border-border/50 p-1 relative">
                  {hourEvents.map((event) => (
                    <div
                      key={event.id}
                      className="px-2 py-1 rounded bg-stone-600/30 border-l-2 border-l-stone-400 text-stone-300 text-xs mb-0.5 flex items-center gap-2"
                      style={getEventStyle(event)}
                    >
                      <span className="font-mono text-[10px] text-stone-400">
                        {new Date(event.start).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {event.title}
                      {event.location && (
                        <span className="text-stone-400 flex items-center gap-0.5">
                          <MapPin size={10} /> {event.location}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
