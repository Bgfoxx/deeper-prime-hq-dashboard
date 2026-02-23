"use client";

import { useMemory, MemoryEntry, localToday } from "@/lib/hooks";
import { Card, Badge, Button, Input, Textarea, Select, Skeleton, EmptyState } from "@/components/ui";
import { BookOpen, Plus, Search, X, ChevronRight, Archive } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const entryTypes = [
  { value: "manual-note", label: "Manual Note" },
  { value: "daily-summary", label: "Daily Summary" },
  { value: "decision", label: "Decision" },
  { value: "learning", label: "Learning" },
  { value: "memory-update", label: "Memory Update" },
];

const tagOptions = [
  "strategy", "content", "audience-signal", "personal-preference",
  "tool-building", "insight", "action-item",
];

const typeBadgeColors: Record<string, "default" | "accent" | "success" | "warning" | "danger" | "muted"> = {
  "daily-summary": "default",
  decision: "accent",
  learning: "success",
  "memory-update": "warning",
  "manual-note": "muted",
};

export default function MemoryLog() {
  const { entries, loading, addEntry, deleteEntry } = useMemory();
  const [viewMode, setViewMode] = useState<"recent" | "archive">("recent");
  const [showAdd, setShowAdd] = useState(false);
  const [expandedEntry, setExpandedEntry] = useState<MemoryEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [newEntry, setNewEntry] = useState({
    title: "",
    content: "",
    type: "manual-note" as MemoryEntry["type"],
    tags: [] as string[],
  });

  const today = localToday();

  // Derive a YYYY-MM-DD date from an entry — Apollo often omits `date` and only writes `createdAt`
  const entryDate = (e: MemoryEntry) => e.date || (e.createdAt ? e.createdAt.split("T")[0] : today);

  // 7-day threshold (local date)
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  // Filter and sort entries
  const filteredEntries = useMemo(() => {
    let result = [...entries];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (e) => e.title.toLowerCase().includes(q) || e.content.toLowerCase().includes(q)
      );
    }
    if (filterType !== "all") {
      result = result.filter((e) => e.type === filterType);
    }
    if (filterTag !== "all") {
      result = result.filter((e) => e.tags.includes(filterTag));
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, searchQuery, filterType, filterTag]);

  const recentEntries = useMemo(
    () => filteredEntries.filter((e) => entryDate(e) >= sevenDaysAgo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEntries, sevenDaysAgo]
  );

  const archiveEntries = useMemo(
    () => filteredEntries.filter((e) => entryDate(e) < sevenDaysAgo),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredEntries, sevenDaysAgo]
  );

  const visibleEntries = viewMode === "recent" ? recentEntries : archiveEntries;

  // Group by date
  const groupedByDate = useMemo(() => {
    const groups: Record<string, MemoryEntry[]> = {};
    visibleEntries.forEach((entry) => {
      const d = entryDate(entry);
      if (!groups[d]) groups[d] = [];
      groups[d].push(entry);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleEntries]);

  // Heat map data (last 90 days)
  const heatMapData = useMemo(() => {
    const days: Record<string, number> = {};
    entries.forEach((e) => {
      days[e.date] = (days[e.date] || 0) + 1;
    });
    const result = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      result.push({ date: dateStr, count: days[dateStr] || 0 });
    }
    return result;
  }, [entries]);

  const maxCount = Math.max(...heatMapData.map((d) => d.count), 1);

  const handleAdd = async () => {
    if (!newEntry.title.trim()) return;
    await addEntry({
      date: today,
      author: "ivan",
      type: newEntry.type,
      title: newEntry.title,
      content: newEntry.content,
      tags: newEntry.tags,
    });
    setNewEntry({ title: "", content: "", type: "manual-note", tags: [] });
    setShowAdd(false);
    toast.success("Entry added");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Memory Log</h1>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
            <button
              onClick={() => setViewMode("recent")}
              className={`px-4 py-2 text-sm transition-colors ${viewMode === "recent" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
            >
              Recent ({recentEntries.length})
            </button>
            <button
              onClick={() => setViewMode("archive")}
              className={`px-4 py-2 text-sm flex items-center gap-1.5 transition-colors ${viewMode === "archive" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"}`}
            >
              <Archive size={13} />
              Archive ({archiveEntries.length})
            </button>
          </div>
          {viewMode === "recent" && (
            <Button onClick={() => setShowAdd(!showAdd)}>
              <span className="flex items-center gap-1.5">
                <Plus size={16} /> New Entry
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* Heat Map */}
      <Card className="!p-4">
        <p className="text-xs text-text-secondary mb-2">Activity (last 90 days)</p>
        <div className="flex gap-[2px] flex-wrap">
          {heatMapData.map((day) => (
            <div
              key={day.date}
              title={`${day.date}: ${day.count} entries`}
              className="w-3 h-3 rounded-sm"
              style={{
                backgroundColor:
                  day.count === 0
                    ? "#44403C"
                    : `rgba(217, 119, 6, ${Math.max(0.2, day.count / maxCount)})`,
              }}
            />
          ))}
        </div>
      </Card>

      {/* Search & Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entries..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
          />
        </div>
        <Select
          value={filterType}
          onChange={setFilterType}
          options={[{ value: "all", label: "All types" }, ...entryTypes]}
        />
        <Select
          value={filterTag}
          onChange={setFilterTag}
          options={[{ value: "all", label: "All tags" }, ...tagOptions.map((t) => ({ value: t, label: t }))]}
        />
        <button
          onClick={() => {
            setFilterType("decision");
            const todayEntries = entries.filter((e) => e.date === today && e.type === "decision");
            if (todayEntries.length === 0) toast.info("No decisions recorded today");
          }}
          className="px-3 py-2 text-xs bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors"
        >
          Today&apos;s Decisions
        </button>
      </div>

      {/* New Entry Form */}
      {showAdd && (
        <Card>
          <h3 className="font-heading text-base mb-3">New Entry</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={newEntry.title}
                onChange={(v) => setNewEntry({ ...newEntry, title: v })}
                placeholder="Entry title..."
              />
              <Select
                value={newEntry.type}
                onChange={(v) => setNewEntry({ ...newEntry, type: v as MemoryEntry["type"] })}
                options={entryTypes}
              />
            </div>
            <Textarea
              value={newEntry.content}
              onChange={(v) => setNewEntry({ ...newEntry, content: v })}
              placeholder="Write your entry (markdown supported)..."
              rows={6}
            />
            <div className="flex flex-wrap gap-1">
              {tagOptions.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setNewEntry((prev) => ({
                      ...prev,
                      tags: prev.tags.includes(tag)
                        ? prev.tags.filter((t) => t !== tag)
                        : [...prev.tags, tag],
                    }))
                  }
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    newEntry.tags.includes(tag)
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-text-secondary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Save Entry</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Entries Timeline */}
      {groupedByDate.length === 0 ? (
        <EmptyState
          icon={viewMode === "archive" ? <Archive size={48} /> : <BookOpen size={48} />}
          title={viewMode === "archive" ? "Archive is empty" : "No entries yet"}
          description={
            viewMode === "archive"
              ? "Entries older than 7 days will appear here automatically"
              : "Start your ship's log with your first entry"
          }
          action={viewMode === "recent" ? <Button onClick={() => setShowAdd(true)}>Write First Entry</Button> : undefined}
        />
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([date, dateEntries]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <p className="text-sm font-mono text-text-secondary">{date}</p>
                {date === today && <Badge color="accent">today</Badge>}
                <div className="flex-1 h-px bg-border" />
              </div>
              <div className="space-y-3">
                {dateEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => setExpandedEntry(entry)}
                    className={`bg-surface border rounded-lg p-4 border-l-2 cursor-pointer hover:border-accent/30 transition-colors group ${
                      entry.author === "apollo"
                        ? "border-l-accent border-border"
                        : "border-l-text-primary/30 border-border"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge color={typeBadgeColors[entry.type] || "default"}>
                          {entry.type}
                        </Badge>
                        <span className="text-xs text-text-secondary">
                          {entry.author === "apollo" ? "Apollo" : "Ivan"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ChevronRight size={14} className="text-text-secondary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteEntry(entry.id).then(() => toast.success("Entry deleted"));
                          }}
                          className="text-text-secondary hover:text-danger transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium mb-1">{entry.title}</h4>
                    <div className="relative overflow-hidden">
                      <div className="text-sm text-text-secondary line-clamp-3">
                        {entry.content}
                      </div>
                      <div
                        className="absolute bottom-0 left-0 right-0 h-5 pointer-events-none"
                        style={{ background: "linear-gradient(to top, #292524, transparent)" }}
                      />
                    </div>
                    {entry.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-3">
                        {entry.tags.map((tag) => (
                          <Badge key={tag} color="muted" className="!text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Entry Modal */}
      {expandedEntry && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-6">
          <div className="w-full max-w-2xl bg-surface border border-border rounded-xl flex flex-col max-h-[80vh]">
            {/* Modal header */}
            <div className="flex items-start justify-between p-5 border-b border-border flex-shrink-0">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge color={typeBadgeColors[expandedEntry.type] || "default"}>
                    {expandedEntry.type}
                  </Badge>
                  <span className="text-xs text-text-secondary">
                    {expandedEntry.author === "apollo" ? "Apollo" : "Ivan"}
                  </span>
                  <span className="text-xs font-mono text-text-secondary/60">{expandedEntry.date}</span>
                </div>
                <h3 className="font-heading text-lg">{expandedEntry.title}</h3>
              </div>
              <button
                onClick={() => setExpandedEntry(null)}
                className="text-text-secondary hover:text-text-primary transition-colors flex-shrink-0 ml-4"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal content */}
            <div className="flex-1 overflow-y-auto p-5">
              <div className="prose prose-invert prose-sm max-w-none text-text-secondary">
                <ReactMarkdown>{expandedEntry.content}</ReactMarkdown>
              </div>
            </div>
            {/* Modal footer */}
            {expandedEntry.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 p-5 border-t border-border flex-shrink-0">
                {expandedEntry.tags.map((tag) => (
                  <Badge key={tag} color="muted" className="!text-[10px]">{tag}</Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
