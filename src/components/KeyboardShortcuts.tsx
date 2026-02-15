"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

const routes = [
  { label: "Dashboard", path: "/" },
  { label: "Sprint Tracker", path: "/sprint" },
  { label: "Tasks", path: "/tasks" },
  { label: "Apollo Board", path: "/apollo" },
  { label: "Content Pipeline", path: "/content" },
  { label: "Memory Log", path: "/memory" },
  { label: "Analytics", path: "/analytics" },
  { label: "Docs", path: "/docs" },
  { label: "Calendar", path: "/calendar" },
  { label: "Settings", path: "/settings" },
];

export function KeyboardShortcuts() {
  const router = useRouter();
  const [showPalette, setShowPalette] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.metaKey && e.key === "k") {
        e.preventDefault();
        setShowPalette((prev) => !prev);
        setSearch("");
      }
      if (e.metaKey && e.key === "n") {
        e.preventDefault();
        router.push("/tasks");
      }
      if (e.key === "Escape") {
        setShowPalette(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [router]);

  if (!showPalette) return null;

  const filtered = routes.filter((r) =>
    r.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-[20vh] z-[100]">
      <div className="bg-surface border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          <input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Navigate to..."
            className="flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter" && filtered.length > 0) {
                router.push(filtered[0].path);
                setShowPalette(false);
              }
            }}
          />
          <button onClick={() => setShowPalette(false)}>
            <X size={16} className="text-text-secondary" />
          </button>
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.map((route) => (
            <button
              key={route.path}
              onClick={() => {
                router.push(route.path);
                setShowPalette(false);
              }}
              className="w-full text-left px-4 py-2.5 text-sm hover:bg-white/5 transition-colors flex items-center justify-between"
            >
              <span>{route.label}</span>
              <span className="text-xs text-text-secondary font-mono">{route.path}</span>
            </button>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-border flex gap-4 text-[10px] text-text-secondary">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>esc Close</span>
        </div>
      </div>
    </div>
  );
}
