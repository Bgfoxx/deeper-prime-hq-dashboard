"use client";

import { useKanban, KanbanCard } from "@/lib/hooks";
import { Card, Badge, Button, Input, Textarea, Select, Skeleton, EmptyState } from "@/components/ui";
import { Bot, Plus, X, Archive, GripVertical } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const labelOptions = ["research", "tool-building", "content", "admin"];
const priorityOptions = ["high", "medium", "low"];

const columnColors: Record<string, string> = {
  backlog: "border-t-text-secondary",
  "in-progress": "border-t-accent",
  review: "border-t-warning",
  done: "border-t-success",
};

export default function ApolloBoard() {
  const { columns, loading, addCard, updateCard, moveCard, archiveCard } = useKanban();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    priority: "medium",
    labels: [] as string[],
  });
  const [draggedCard, setDraggedCard] = useState<{ cardId: string; fromColumn: string } | null>(null);

  const handleAddCard = async (columnId: string) => {
    if (!newCard.title.trim()) return;
    await addCard(columnId, {
      title: newCard.title,
      description: newCard.description,
      priority: newCard.priority as KanbanCard["priority"],
      labels: newCard.labels,
      apolloNotes: "",
    });
    setNewCard({ title: "", description: "", priority: "medium", labels: [] });
    setAddingTo(null);
    toast.success("Card added");
  };

  const handleDragStart = (cardId: string, fromColumn: string) => {
    setDraggedCard({ cardId, fromColumn });
  };

  const handleDrop = async (toColumn: string) => {
    if (!draggedCard) return;
    if (draggedCard.fromColumn === toColumn) {
      setDraggedCard(null);
      return;
    }
    await moveCard(draggedCard.cardId, draggedCard.fromColumn, toColumn, 0);
    setDraggedCard(null);
    toast.success("Card moved");
  };

  const handleArchive = async (cardId: string, columnId: string) => {
    await archiveCard(cardId, columnId);
    toast.success("Card archived");
  };

  const priorityDot: Record<string, string> = {
    high: "bg-accent",
    medium: "bg-border",
    low: "bg-text-secondary/30",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl">Apollo Board</h1>
          <p className="text-text-secondary text-sm mt-1">Tasks delegated to Apollo</p>
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-4 gap-4 min-h-[600px]">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`bg-surface/50 rounded-xl border border-border border-t-2 ${columnColors[col.id] || "border-t-border"} p-3 flex flex-col`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col.id)}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">{col.title}</h3>
              <Badge color="muted">{col.cards.length}</Badge>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto">
              {col.cards.map((card) => (
                <div
                  key={card.id}
                  draggable
                  onDragStart={() => handleDragStart(card.id, col.id)}
                  className="bg-surface border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-accent/30 transition-colors group"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical size={14} className="text-text-secondary/30 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${priorityDot[card.priority]}`} />
                        <p className="text-sm font-medium truncate">{card.title}</p>
                      </div>
                      {card.description && (
                        <p className="text-xs text-text-secondary line-clamp-2 mb-2">
                          {card.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        {card.labels.map((label) => (
                          <Badge key={label} color="muted" className="!text-[10px] !px-1.5">
                            {label}
                          </Badge>
                        ))}
                      </div>
                      {card.apolloNotes && (
                        <div className="mt-2 p-2 bg-accent/5 border-l-2 border-accent rounded text-xs text-text-secondary">
                          {card.apolloNotes}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setEditingCard(card)}
                      className="text-xs text-text-secondary hover:text-accent"
                    >
                      Edit
                    </button>
                    {col.id === "done" && (
                      <button
                        onClick={() => handleArchive(card.id, col.id)}
                        className="text-xs text-text-secondary hover:text-accent ml-2"
                      >
                        <Archive size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Add card button */}
            {addingTo === col.id ? (
              <div className="mt-2 p-2 bg-surface border border-border rounded-lg">
                <Input
                  value={newCard.title}
                  onChange={(v) => setNewCard({ ...newCard, title: v })}
                  placeholder="Card title..."
                />
                <Textarea
                  value={newCard.description}
                  onChange={(v) => setNewCard({ ...newCard, description: v })}
                  placeholder="Description..."
                  rows={2}
                  className="mt-2"
                />
                <div className="flex gap-2 mt-2">
                  <Select
                    value={newCard.priority}
                    onChange={(v) => setNewCard({ ...newCard, priority: v })}
                    options={priorityOptions.map((p) => ({ value: p, label: p }))}
                    className="flex-1"
                  />
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {labelOptions.map((label) => (
                    <button
                      key={label}
                      onClick={() => {
                        setNewCard((prev) => ({
                          ...prev,
                          labels: prev.labels.includes(label)
                            ? prev.labels.filter((l) => l !== label)
                            : [...prev.labels, label],
                        }));
                      }}
                      className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                        newCard.labels.includes(label)
                          ? "border-accent text-accent"
                          : "border-border text-text-secondary"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={() => handleAddCard(col.id)}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(col.id)}
                className="mt-2 flex items-center gap-1 text-xs text-text-secondary hover:text-accent transition-colors p-2"
              >
                <Plus size={12} /> Add card
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Edit Card Modal */}
      {editingCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-lg !p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg">Edit Card</h3>
              <button onClick={() => setEditingCard(null)}>
                <X size={18} className="text-text-secondary hover:text-text-primary" />
              </button>
            </div>
            <div className="space-y-3">
              <Input
                value={editingCard.title}
                onChange={(v) => setEditingCard({ ...editingCard, title: v })}
                placeholder="Title"
              />
              <Textarea
                value={editingCard.description}
                onChange={(v) => setEditingCard({ ...editingCard, description: v })}
                placeholder="Description"
              />
              <Select
                value={editingCard.priority}
                onChange={(v) => setEditingCard({ ...editingCard, priority: v as KanbanCard["priority"] })}
                options={priorityOptions.map((p) => ({ value: p, label: p }))}
              />
              <div>
                <p className="text-xs text-text-secondary mb-1">Apollo Notes</p>
                <Textarea
                  value={editingCard.apolloNotes}
                  onChange={(v) => setEditingCard({ ...editingCard, apolloNotes: v })}
                  placeholder="Notes from Apollo..."
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setEditingCard(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={async () => {
                    await updateCard(editingCard.id, {
                      title: editingCard.title,
                      description: editingCard.description,
                      priority: editingCard.priority,
                      apolloNotes: editingCard.apolloNotes,
                    });
                    setEditingCard(null);
                    toast.success("Card updated");
                  }}
                >
                  Save
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
