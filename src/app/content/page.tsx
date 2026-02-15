"use client";

import { useContent, ContentPiece, ContentAngle } from "@/lib/hooks";
import { Card, Badge, Button, Input, Select, Textarea, Skeleton, EmptyState } from "@/components/ui";
import { Newspaper, Plus, X, Linkedin, Youtube, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const stageColumns = [
  { id: "idea", label: "Idea" },
  { id: "researching", label: "Researching" },
  { id: "drafting", label: "Drafting" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published" },
];

const formatIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={12} />,
  youtube: <Youtube size={12} />,
  email: <Mail size={12} />,
};

const statusColors: Record<string, string> = {
  "not-started": "bg-text-secondary/30",
  drafting: "bg-warning",
  ready: "bg-accent",
  published: "bg-success",
};

export default function ContentPipeline() {
  const { content, angles, loading, addContent, updateContent, deleteContent } = useContent();
  const [viewMode, setViewMode] = useState<"board" | "list">("board");
  const [filterAngle, setFilterAngle] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editingPiece, setEditingPiece] = useState<ContentPiece | null>(null);
  const [newPiece, setNewPiece] = useState({ title: "", angle: "" });

  const filtered = filterAngle === "all"
    ? content
    : content.filter((c) => c.angle === filterAngle);

  const getAngleColor = (angleName: string) =>
    angles.find((a) => a.name === angleName)?.color || "#666";

  const handleAdd = async () => {
    if (!newPiece.title.trim()) return;
    await addContent({ title: newPiece.title, angle: newPiece.angle });
    setNewPiece({ title: "", angle: "" });
    setShowAdd(false);
    toast.success("Content idea added");
  };

  const handleStageChange = async (id: string, stage: string) => {
    await updateContent(id, { stage: stage as ContentPiece["stage"] });
    toast.success("Stage updated");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Content Pipeline</h1>
        <Button onClick={() => setShowAdd(true)}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> New Idea
          </span>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode("board")}
            className={`px-4 py-2 text-sm transition-colors ${viewMode === "board" ? "bg-accent text-white" : "text-text-secondary"}`}
          >
            Board
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-4 py-2 text-sm transition-colors ${viewMode === "list" ? "bg-accent text-white" : "text-text-secondary"}`}
          >
            List
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterAngle("all")}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterAngle === "all" ? "bg-accent/20 text-accent" : "text-text-secondary"}`}
          >
            All
          </button>
          {angles.map((angle) => (
            <button
              key={angle.id}
              onClick={() => setFilterAngle(angle.name)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors`}
              style={{
                backgroundColor: filterAngle === angle.name ? angle.color + "33" : undefined,
                color: filterAngle === angle.name ? angle.color : undefined,
              }}
            >
              {angle.name}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Add */}
      {showAdd && (
        <Card>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                value={newPiece.title}
                onChange={(v) => setNewPiece({ ...newPiece, title: v })}
                placeholder="Content title..."
              />
            </div>
            <Select
              value={newPiece.angle}
              onChange={(v) => setNewPiece({ ...newPiece, angle: v })}
              options={[
                { value: "", label: "Select angle..." },
                ...angles.map((a) => ({ value: a.name, label: a.name })),
              ]}
            />
            <Button onClick={handleAdd}>Add</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* Board View */}
      {viewMode === "board" ? (
        <div className="grid grid-cols-5 gap-3">
          {stageColumns.map((stage) => {
            const stagePieces = filtered.filter((c) => c.stage === stage.id);
            return (
              <div key={stage.id} className="bg-surface/30 rounded-xl border border-border p-3">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium">{stage.label}</h3>
                  <Badge color="muted">{stagePieces.length}</Badge>
                </div>
                <div className="space-y-2">
                  {stagePieces.map((piece) => (
                    <div
                      key={piece.id}
                      onClick={() => setEditingPiece(piece)}
                      className="bg-surface border border-border rounded-lg p-3 cursor-pointer hover:border-accent/30 transition-colors"
                    >
                      <p className="text-sm font-medium mb-2 line-clamp-2">{piece.title}</p>
                      {piece.angle && (
                        <span
                          className="inline-block px-2 py-0.5 text-[10px] rounded-full mb-2"
                          style={{
                            backgroundColor: getAngleColor(piece.angle) + "33",
                            color: getAngleColor(piece.angle),
                          }}
                        >
                          {piece.angle}
                        </span>
                      )}
                      <div className="flex gap-2">
                        {Object.entries(piece.formats).map(([format, data]) => (
                          <div key={format} className="flex items-center gap-1" title={`${format}: ${data.status}`}>
                            {formatIcons[format]}
                            <div className={`w-1.5 h-1.5 rounded-full ${statusColors[data.status] || "bg-text-secondary/30"}`} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2">
          {filtered
            .sort((a, b) => a.weekNumber - b.weekNumber)
            .map((piece) => (
              <div
                key={piece.id}
                onClick={() => setEditingPiece(piece)}
                className="flex items-center gap-4 bg-surface border border-border rounded-lg p-4 cursor-pointer hover:border-accent/30 transition-colors"
              >
                <span className="text-xs font-mono text-text-secondary w-16">
                  Week {piece.weekNumber}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{piece.title}</p>
                </div>
                {piece.angle && (
                  <span
                    className="px-2 py-0.5 text-[10px] rounded-full"
                    style={{
                      backgroundColor: getAngleColor(piece.angle) + "33",
                      color: getAngleColor(piece.angle),
                    }}
                  >
                    {piece.angle}
                  </span>
                )}
                <Badge color="muted">{piece.stage}</Badge>
                <div className="flex gap-2">
                  {Object.entries(piece.formats).map(([format, data]) => (
                    <div key={format} className="flex items-center gap-1">
                      {formatIcons[format]}
                      <div className={`w-1.5 h-1.5 rounded-full ${statusColors[data.status]}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Edit Modal */}
      {editingPiece && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-8">
          <Card className="w-full max-w-2xl !p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg">Edit Content Piece</h3>
              <button onClick={() => setEditingPiece(null)}>
                <X size={18} className="text-text-secondary hover:text-text-primary" />
              </button>
            </div>
            <div className="space-y-4">
              <Input
                value={editingPiece.title}
                onChange={(v) => setEditingPiece({ ...editingPiece, title: v })}
                placeholder="Title"
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={editingPiece.angle}
                  onChange={(v) => setEditingPiece({ ...editingPiece, angle: v })}
                  options={angles.map((a) => ({ value: a.name, label: a.name }))}
                />
                <Select
                  value={editingPiece.stage}
                  onChange={(v) => setEditingPiece({ ...editingPiece, stage: v as ContentPiece["stage"] })}
                  options={stageColumns.map((s) => ({ value: s.id, label: s.label }))}
                />
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Core Idea</p>
                <Textarea
                  value={editingPiece.coreIdea}
                  onChange={(v) => setEditingPiece({ ...editingPiece, coreIdea: v })}
                  placeholder="What's the core idea?"
                  rows={3}
                />
              </div>
              <div>
                <p className="text-xs text-text-secondary mb-1">Notes</p>
                <Textarea
                  value={editingPiece.notes}
                  onChange={(v) => setEditingPiece({ ...editingPiece, notes: v })}
                  placeholder="Working notes..."
                  rows={3}
                />
              </div>

              {/* Format Statuses */}
              <div>
                <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">Format Status</p>
                {Object.entries(editingPiece.formats).map(([format, data]) => (
                  <div key={format} className="flex items-center gap-3 mb-2">
                    <span className="text-sm w-20 capitalize">{format}</span>
                    <Select
                      value={data.status}
                      onChange={(v) =>
                        setEditingPiece({
                          ...editingPiece,
                          formats: {
                            ...editingPiece.formats,
                            [format]: { ...data, status: v },
                          },
                        })
                      }
                      options={[
                        { value: "not-started", label: "Not Started" },
                        { value: "drafting", label: "Drafting" },
                        { value: "ready", label: "Ready" },
                        { value: "published", label: "Published" },
                      ]}
                      className="flex-1"
                    />
                    <Input
                      value={data.url}
                      onChange={(v) =>
                        setEditingPiece({
                          ...editingPiece,
                          formats: {
                            ...editingPiece.formats,
                            [format]: { ...data, url: v },
                          },
                        })
                      }
                      placeholder="URL..."
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-between">
                <Button
                  variant="danger"
                  onClick={async () => {
                    await deleteContent(editingPiece.id);
                    setEditingPiece(null);
                    toast.success("Content deleted");
                  }}
                >
                  Delete
                </Button>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setEditingPiece(null)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={async () => {
                      await updateContent(editingPiece.id, editingPiece);
                      setEditingPiece(null);
                      toast.success("Content updated");
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
