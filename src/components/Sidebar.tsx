"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Sun,
  CheckSquare,
  Lightbulb,
  Bot,
  Newspaper,
  BookOpen,
  BarChart3,
  FileText,
  Calendar,
  Settings,
} from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sprint", label: "Sprint Tracker", icon: Target },
  { href: "/agenda", label: "Daily Agenda", icon: Sun },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/apollo", label: "Apollo Board", icon: Bot },
  { href: "/content", label: "Content Pipeline", icon: Newspaper },
  { href: "/memory", label: "Memory Log", icon: BookOpen },
  { href: "/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/docs", label: "Docs", icon: FileText },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SprintCountdown() {
  const [dayCount, setDayCount] = useState<{ day: number; total: number } | null>(null);

  useEffect(() => {
    fetch("/api/sprint")
      .then((r) => r.json())
      .then((data) => {
        const sprint = data.currentSprint;
        if (!sprint) return;
        const start = new Date(sprint.startDate);
        const end = new Date(sprint.endDate);
        const now = new Date();
        const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const elapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setDayCount({ day: Math.max(1, Math.min(elapsed, totalDays)), total: totalDays });
      })
      .catch(() => {});
  }, []);

  if (!dayCount) return null;

  const pct = (dayCount.day / dayCount.total) * 100;

  return (
    <div className="px-4 py-3 border-t border-border">
      <p className="text-xs text-text-secondary mb-1 uppercase tracking-wider">Sprint Progress</p>
      <p className="text-sm font-mono text-text-primary">
        Day {dayCount.day} of {dayCount.total}
      </p>
      <div className="mt-2 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-sidebar flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-border">
        <h1 className="font-heading text-xl text-text-primary tracking-wide">
          Deeper Prime
        </h1>
        <p className="text-xs text-text-secondary mt-0.5">HQ Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors duration-200 ${
                isActive
                  ? "text-accent bg-accent/10 border-r-2 border-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`}
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sprint Countdown */}
      <SprintCountdown />
    </aside>
  );
}
