"use client";

import { useIdeas, Idea } from "@/lib/hooks";
import { Card, Badge, Button, Input, Textarea, Skeleton } from "@/components/ui";
import { Lightbulb, Plus, Archive, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const sourceColors: Record<string, string> = {
  ivan: "bg-accent/20 text-accent",
  apollo: "bg-success/20 text-success",
};

export default function IdeasPage() {
  const {
    ideas,
    archive,
    tags,
    loading,
    addIdea,
    updateIdea,
    archiveIdea,
    restoreIdea,
    deleteIdea,
  } = useIdeas();

  const [viewMode, setViewMode] = useState<"ideas" | "archive">("ideas");
  const [sourceFilter, setSourceFilter] = useState<"all" | "ivan" | "apollo">("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIdea, setEditingIdea] = useState<Idea | null>(null);
  const [newIdea, setNewIdea] = useState({ title: "", body: "", tags: [] as string[] });

  const handleAddIdea = async () => {
    if (!newIdea.title.trim()) return;
    await addIdea({ title: newIdea.title.trim(), body: newIdea.body, tags: newIdea.tags, source: "ivan" });
    setNewIdea({ title: "", body: "", tags: [] });
    setShowAddForm(false);
    toast.success("Idea added");
  };

  const filteredIdeas = sourceFilter === "all"
    ? ideas
    : ideas.filter((i) => i.source === sourceFilter);

  if (loading && ideas.length === 0 && archive.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Ideas</h1>
          <p className="text-text-secondary text-sm mt-1">Capture ideas — yours and Apollo&apos;s</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Source filter */}
          <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
            {(["all", "ivan", "apollo"] as const).map((src) => (
              <button
                key={src}
                onClick={() => setSourceFilter(src)}
                className={`px-3 py-1.5 text-sm capitalize transition-colors ${
                  sourceFilter === src ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {src}
              </button>
            ))}
          </div>

          {/* Ideas / Archive toggle */}
          <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
            {(["ideas", "archive"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-4 py-1.5 text-sm capitalize transition-colors flex items-center gap-1.5 ${
                  viewMode === mode ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {mode === "archive" && <Archive size={13} />}
                {mode === "archive" ? `Archive (${archive.length})` : `Ideas (${ideas.length})`}
              </button>
            ))}
          </div>

          {viewMode === "ideas" && (
            <Button onClick={() => setShowAddForm(true)}>
              <span className="flex items-center gap-1.5"><Plus size={14} /> New Idea</span>
            </Button>
          )}
        </div>
      </div>

      {/* Add Idea Form */}
      {showAddForm && viewMode === "ideas" && (
        <Card className="!p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium">New Idea</p>
            <button onClick={() => setShowAddForm(false)}>
              <X size={16} className="text-text-secondary hover:text-text-primary" />
            </button>
          </div>
          <div className="space-y-3">
            <Input
              value={newIdea.title}
              onChange={(v) => setNewIdea({ ...newIdea, title: v })}
              placeholder="Idea title..."
            />
            <Textarea
              value={newIdea.body}
              onChange={(v) => setNewIdea({ ...newIdea, body: v })}
              placeholder="Describe the idea..."
              rows={3}
            />
            <div className="flex flex-wrap gap-1">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() =>
                    setNewIdea((prev) => ({
                      ...prev,
                      tags: prev.tags.includes(tag)
                        ? prev.tags.filter((t) => t !== tag)
                        : [...prev.tags, tag],
                    }))
                  }
                  className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                    newIdea.tags.includes(tag)
                      ? "border-accent text-accent bg-accent/10"
                      : "border-border text-text-secondary"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddIdea}>Add Idea</Button>
              <Button size="sm" variant="ghost" onClick={() => setShowAddForm(false)}>Cancel</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Archive View */}
      {viewMode === "archive" && (
        <div className="space-y-2">
          {archive.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              No archived ideas yet.
            </div>
          ) : (
            archive.map((idea) => (
              <div
                key={idea.id}
                className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-text-secondary">{idea.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${sourceColors[idea.source] ?? ""}`}>
                      {idea.source}
                    </span>
                  </div>
                  {idea.body && (
                    <p className="text-xs text-text-secondary/60 line-clamp-2">{idea.body}</p>
                  )}
                  <div className="flex gap-1 mt-1.5 flex-wrap">
                    {idea.tags.map((tag) => (
                      <Badge key={tag} color="muted" className="!text-[10px] !px-1.5">{tag}</Badge>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      await restoreIdea(idea.id);
                      toast.success("Idea restored");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-all"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                  <button
                    onClick={async () => {
                      await deleteIdea(idea.id);
                      toast.success("Idea deleted permanently");
                    }}
                    className="px-3 py-1.5 text-xs rounded-lg border border-border text-danger/60 hover:text-danger hover:border-danger/30 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ideas List */}
      {viewMode === "ideas" && (
        <div className="space-y-2">
          {filteredIdeas.length === 0 ? (
            <div className="text-center py-16 text-text-secondary text-sm">
              {sourceFilter !== "all"
                ? `No ${sourceFilter} ideas yet.`
                : "No ideas yet. Click 'New Idea' to add one."}
            </div>
          ) : (
            filteredIdeas.map((idea) => (
              <div
                key={idea.id}
                onClick={() => setEditingIdea(idea)}
                className="flex items-start gap-4 bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent/30 transition-colors group"
              >
                <Lightbulb size={16} className="text-accent/40 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium">{idea.title}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full capitalize flex-shrink-0 ${sourceColors[idea.source] ?? ""}`}>
                      {idea.source}
                    </span>
                  </div>
                  {idea.body && (
                    <p className="text-xs text-text-secondary line-clamp-2">{idea.body}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {idea.tags.map((tag) => (
                      <Badge key={tag} color="muted" className="!text-[10px] !px-1.5">{tag}</Badge>
                    ))}
                    <span className="text-[10px] text-text-secondary/40 font-mono ml-auto flex-shrink-0">
                      {new Date(idea.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    archiveIdea(idea.id).then(() => toast.success("Archived"));
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-text-secondary hover:text-accent transition-all flex-shrink-0"
                  title="Archive idea"
                >
                  <Archive size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Edit Modal */}
      {editingIdea && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg !p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg">Edit Idea</h3>
              <button onClick={() => setEditingIdea(null)}>
                <X size={18} className="text-text-secondary hover:text-text-primary" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                value={editingIdea.title}
                onChange={(v) => setEditingIdea({ ...editingIdea, title: v })}
                placeholder="Title"
              />
              <Textarea
                value={editingIdea.body}
                onChange={(v) => setEditingIdea({ ...editingIdea, body: v })}
                placeholder="Describe the idea..."
                rows={4}
              />
              <div>
                <p className="text-xs text-text-secondary mb-2">Tags</p>
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() =>
                        setEditingIdea({
                          ...editingIdea,
                          tags: editingIdea.tags.includes(tag)
                            ? editingIdea.tags.filter((t) => t !== tag)
                            : [...editingIdea.tags, tag],
                        })
                      }
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                        editingIdea.tags.includes(tag)
                          ? "border-accent text-accent bg-accent/10"
                          : "border-border text-text-secondary"
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className={`text-[10px] px-2 py-1 rounded-full capitalize ${sourceColors[editingIdea.source] ?? ""}`}>
                  {editingIdea.source}
                </span>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditingIdea(null)}>Cancel</Button>
                  <Button
                    onClick={async () => {
                      await updateIdea(editingIdea.id, {
                        title: editingIdea.title,
                        body: editingIdea.body,
                        tags: editingIdea.tags,
                      });
                      setEditingIdea(null);
                      toast.success("Idea updated");
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
