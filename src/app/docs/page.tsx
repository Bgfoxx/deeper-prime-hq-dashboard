"use client";

import { useDocs, Doc } from "@/lib/hooks";
import { Card, Badge, Button, Input, Textarea, Select, Skeleton, EmptyState } from "@/components/ui";
import { FileText, Search, Plus, ArrowLeft, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

const categories = ["strategy", "content", "research", "personal"];

export default function DocsPage() {
  const { docs, loading, addDoc, getDocContent } = useDocs();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [viewingDoc, setViewingDoc] = useState<{ doc: Doc; content: string } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newDoc, setNewDoc] = useState({
    filename: "",
    title: "",
    category: "strategy",
    description: "",
    content: "",
  });

  const filtered = docs.filter((d) => {
    const matchesSearch =
      !searchQuery ||
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = filterCategory === "all" || d.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  const openDoc = async (doc: Doc) => {
    const content = await getDocContent(doc.filename);
    setViewingDoc({ doc, content });
  };

  const handleAdd = async () => {
    if (!newDoc.filename.trim() || !newDoc.title.trim()) return;
    const filename = newDoc.filename.endsWith(".md") ? newDoc.filename : `${newDoc.filename}.md`;
    await addDoc(
      { filename, title: newDoc.title, category: newDoc.category, description: newDoc.description },
      newDoc.content
    );
    setNewDoc({ filename: "", title: "", category: "strategy", description: "", content: "" });
    setShowAdd(false);
    toast.success("Document added");
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  // Document viewer
  if (viewingDoc) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewingDoc(null)}
            className="text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="font-heading text-2xl">{viewingDoc.doc.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge color="muted">{viewingDoc.doc.category}</Badge>
              <span className="text-xs font-mono text-text-secondary">
                {viewingDoc.doc.filename}
              </span>
            </div>
          </div>
        </div>
        <Card>
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{viewingDoc.content || "*No content yet*"}</ReactMarkdown>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl">Docs</h1>
        <Button onClick={() => setShowAdd(!showAdd)}>
          <span className="flex items-center gap-1.5">
            <Plus size={16} /> Add Document
          </span>
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:border-accent"
          />
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterCategory === "all" ? "bg-accent/20 text-accent" : "text-text-secondary"}`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterCategory === cat ? "bg-accent/20 text-accent" : "text-text-secondary"}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Add Form */}
      {showAdd && (
        <Card>
          <h3 className="font-heading text-base mb-3">New Document</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input
                value={newDoc.title}
                onChange={(v) => setNewDoc({ ...newDoc, title: v })}
                placeholder="Document title"
              />
              <Input
                value={newDoc.filename}
                onChange={(v) => setNewDoc({ ...newDoc, filename: v })}
                placeholder="filename.md"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={newDoc.category}
                onChange={(v) => setNewDoc({ ...newDoc, category: v })}
                options={categories.map((c) => ({ value: c, label: c }))}
              />
              <Input
                value={newDoc.description}
                onChange={(v) => setNewDoc({ ...newDoc, description: v })}
                placeholder="Brief description"
              />
            </div>
            <Textarea
              value={newDoc.content}
              onChange={(v) => setNewDoc({ ...newDoc, content: v })}
              placeholder="Document content (markdown)..."
              rows={8}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button onClick={handleAdd}>Create</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Document Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FileText size={48} />}
          title="No documents"
          description="Add your first shared document"
          action={<Button onClick={() => setShowAdd(true)}>Add Document</Button>}
        />
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:border-accent/30 transition-colors"
            >
              <button onClick={() => openDoc(doc)} className="w-full text-left">
                <div className="flex items-start justify-between mb-2">
                  <FileText size={20} className="text-accent" />
                  <Badge color="muted">{doc.category}</Badge>
                </div>
                <h3 className="text-sm font-medium mb-1">{doc.title}</h3>
                {doc.description && (
                  <p className="text-xs text-text-secondary line-clamp-2">{doc.description}</p>
                )}
                <p className="text-xs font-mono text-text-secondary mt-2">{doc.filename}</p>
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
