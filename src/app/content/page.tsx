"use client";

import {
  useContent,
  useContentDraft,
  ContentPiece,
  DraftFormat,
} from "@/lib/hooks";
import { Card, Badge, Button, Input, Select, Textarea, Skeleton, EmptyState } from "@/components/ui";
import {
  Plus, X, Linkedin, Youtube, Mail, Twitter, Instagram,
  Archive, RotateCcw, Trash2, ChevronRight, Save, Eye, EyeOff,
  FileText, History, CornerUpLeft,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import ReactMarkdown from "react-markdown";

// ─── Constants ────────────────────────────────────────────────────────────────

const PUBLISHED_CAP = 6;

const stageColumns = [
  { id: "idea", label: "Idea" },
  { id: "researching", label: "Researching" },
  { id: "drafting", label: "Drafting" },
  { id: "ready", label: "Ready" },
  { id: "published", label: "Published" },
];

const draftTabs: { id: DraftFormat; label: string; icon: React.ReactNode }[] = [
  { id: "research", label: "Research", icon: <FileText size={13} /> },
  { id: "youtube", label: "YouTube", icon: <Youtube size={13} /> },
  { id: "linkedin", label: "LinkedIn", icon: <Linkedin size={13} /> },
  { id: "twitter", label: "Twitter / X", icon: <Twitter size={13} /> },
  { id: "instagram", label: "Instagram", icon: <Instagram size={13} /> },
  { id: "email", label: "Email", icon: <Mail size={13} /> },
];

const formatIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin size={12} />,
  youtube: <Youtube size={12} />,
  email: <Mail size={12} />,
  twitter: <Twitter size={12} />,
  instagram: <Instagram size={12} />,
};

const statusColors: Record<string, string> = {
  "not-started": "bg-text-secondary/30",
  drafting: "bg-warning",
  ready: "bg-accent",
  published: "bg-success",
};

// ─── Studio Component ─────────────────────────────────────────────────────────

function Studio({
  piece: initialPiece,
  angles,
  onClose,
  onSave,
  onDelete,
  onArchive,
}: {
  piece: ContentPiece;
  angles: { id: string; name: string; color: string }[];
  onClose: () => void;
  onSave: (id: string, updates: Partial<ContentPiece>) => Promise<void>;
  onDelete: () => Promise<void>;
  onArchive?: () => Promise<void>;
}) {
  const [meta, setMeta] = useState<ContentPiece>({ ...initialPiece });
  const [metaSaving, setMetaSaving] = useState(false);
  const [activeFormat, setActiveFormat] = useState<DraftFormat>("research");
  const [preview, setPreview] = useState(false);
  const [localDraft, setLocalDraft] = useState("");

  const { draftContent, loading: draftLoading, saving: draftSaving, lastSaved, saveDraft } =
    useContentDraft(initialPiece.id, activeFormat);

  // Sync localDraft whenever the hook loads new content (format switch or initial load)
  useEffect(() => {
    setLocalDraft(draftContent);
  }, [draftContent]);

  const handleFormatChange = useCallback(
    async (format: DraftFormat) => {
      if (format === activeFormat) return;
      await saveDraft(localDraft); // persist current tab before switching
      setLocalDraft("");           // clear immediately so old text doesn't flash
      setPreview(false);
      setActiveFormat(format);    // hook re-runs, draftContent updates, useEffect syncs
    },
    [activeFormat, localDraft, saveDraft]
  );

  const handleMetaSave = async () => {
    setMetaSaving(true);
    try {
      // Pass a clean copy without the id field in updates (API extracts id separately)
      const { id, ...updates } = meta;
      await onSave(id, updates);
      toast.success("Saved");
    } finally {
      setMetaSaving(false);
    }
  };

  // ── History state ──────────────────────────────────────────────────────────
  const [showHistory, setShowHistory] = useState(false);
  const [backups, setBackups] = useState<{ filename: string; savedAt: string }[]>([]);
  const [backupsLoading, setBackupsLoading] = useState(false);
  const [previewBackup, setPreviewBackup] = useState<{ filename: string; content: string } | null>(null);

  const openHistory = async () => {
    setBackupsLoading(true);
    setPreviewBackup(null);
    setShowHistory(true);
    try {
      const res = await fetch(
        `/api/content/draft/backups?pieceId=${initialPiece.id}&format=${activeFormat}`
      );
      const json = await res.json();
      setBackups(json.backups ?? []);
    } finally {
      setBackupsLoading(false);
    }
  };

  const loadBackupPreview = async (filename: string) => {
    const res = await fetch(`/api/content/draft/backups?filename=${encodeURIComponent(filename)}`);
    const json = await res.json();
    setPreviewBackup({ filename, content: json.content ?? "" });
  };

  const restoreBackup = () => {
    if (!previewBackup) return;
    setLocalDraft(previewBackup.content);
    setShowHistory(false);
    setPreviewBackup(null);
    toast.success("Version restored — click Save Draft to keep it");
  };

  const formatBackupTime = (savedAt: string) => {
    const d = new Date(savedAt);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);
    const diffD = Math.floor(diffMs / 86400000);
    if (diffMs < 60000) return "just now";
    if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7) return `${diffD}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const handleDraftSave = async () => {
    await saveDraft(localDraft);
    toast.success("Draft saved");
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/70">
      {/* Left panel — metadata */}
      <div className="w-80 flex-shrink-0 bg-[#0C0A09] border-r border-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <span className="text-xs uppercase tracking-wider text-text-secondary">Content Studio</span>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Scrollable metadata */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Title */}
          <div>
            <p className="text-xs text-text-secondary mb-1">Title</p>
            <textarea
              value={meta.title}
              onChange={(e) => setMeta((m) => ({ ...m, title: e.target.value }))}
              className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text-primary resize-none focus:outline-none focus:border-accent/50"
              rows={2}
            />
          </div>

          {/* Stage & Angle */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs text-text-secondary mb-1">Stage</p>
              <Select
                value={meta.stage}
                onChange={(v) => setMeta((m) => ({ ...m, stage: v as ContentPiece["stage"] }))}
                options={stageColumns.map((s) => ({ value: s.id, label: s.label }))}
              />
            </div>
            <div>
              <p className="text-xs text-text-secondary mb-1">Angle</p>
              <Select
                value={meta.angle}
                onChange={(v) => setMeta((m) => ({ ...m, angle: v }))}
                options={[{ value: "", label: "None" }, ...angles.map((a) => ({ value: a.name, label: a.name }))]}
              />
            </div>
          </div>

          {/* Core Idea */}
          <div>
            <p className="text-xs text-text-secondary mb-1">Core Idea</p>
            <Textarea
              value={meta.coreIdea}
              onChange={(v) => setMeta((m) => ({ ...m, coreIdea: v }))}
              placeholder="What's the core idea?"
              rows={3}
            />
          </div>

          {/* Notes */}
          <div>
            <p className="text-xs text-text-secondary mb-1">Notes</p>
            <Textarea
              value={meta.notes}
              onChange={(v) => setMeta((m) => ({ ...m, notes: v }))}
              placeholder="Working notes..."
              rows={2}
            />
          </div>

          {/* Channels */}
          <div>
            <p className="text-xs text-text-secondary mb-2 uppercase tracking-wider">Channels</p>
            <div className="flex flex-wrap gap-2">
              {(["linkedin", "youtube", "email", "twitter", "instagram"] as const).map((format) => {
                const data = meta.formats[format] ?? { status: "not-started", publishDate: null, url: "" };
                const selected = data.status !== "not-started";
                const labels: Record<string, string> = {
                  linkedin: "LinkedIn", youtube: "YouTube", email: "Email",
                  twitter: "Twitter/X", instagram: "Instagram",
                };
                return (
                  <button
                    key={format}
                    onClick={() =>
                      setMeta((m) => ({
                        ...m,
                        formats: {
                          ...m.formats,
                          [format]: { ...data, status: selected ? "not-started" : "ready" },
                        },
                      }))
                    }
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors ${
                      selected
                        ? "border-accent text-accent bg-accent/10"
                        : "border-border text-text-secondary hover:border-accent/30 hover:text-text-primary"
                    }`}
                  >
                    {formatIcons[format]}
                    {labels[format]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-border space-y-2">
          <Button onClick={handleMetaSave} className="w-full" disabled={metaSaving}>
            <span className="flex items-center justify-center gap-1.5">
              <Save size={14} /> {metaSaving ? "Saving…" : "Save Metadata"}
            </span>
          </Button>
          <div className="flex gap-2">
            {onArchive && (
              <button
                onClick={async () => { await onArchive(); onClose(); }}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-colors"
              >
                <Archive size={12} /> Archive
              </button>
            )}
            <button
              onClick={async () => {
                if (!confirm("Permanently delete this piece?")) return;
                await onDelete();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs rounded-lg border border-border text-text-secondary hover:text-danger hover:border-danger/30 transition-colors"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      </div>

      {/* Right panel — draft editor */}
      <div className="flex-1 flex flex-col bg-bg min-w-0">
        {/* Draft tab bar */}
        <div className="flex items-center gap-1 px-4 border-b border-border bg-[#0C0A09] overflow-x-auto">
          {draftTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { handleFormatChange(tab.id); setShowHistory(false); setPreviewBackup(null); }}
              className={`flex items-center gap-1.5 px-3 py-3 text-xs whitespace-nowrap border-b-2 transition-colors ${
                activeFormat === tab.id
                  ? "border-accent text-text-primary"
                  : "border-transparent text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2 pl-4">
            {lastSaved && !draftSaving && !showHistory && (
              <span className="text-xs text-text-secondary font-mono whitespace-nowrap">
                Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            )}
            {draftSaving && <span className="text-xs text-text-secondary">Saving…</span>}
            {!showHistory && (
              <>
                <button
                  onClick={() => setPreview(!preview)}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded text-text-secondary hover:text-text-primary transition-colors"
                >
                  {preview ? <EyeOff size={13} /> : <Eye size={13} />}
                  {preview ? "Edit" : "Preview"}
                </button>
                <button
                  onClick={handleDraftSave}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
                >
                  <Save size={12} /> Save Draft
                </button>
              </>
            )}
            <button
              onClick={() => showHistory ? (setShowHistory(false), setPreviewBackup(null)) : openHistory()}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                showHistory
                  ? "border-accent/40 bg-accent/10 text-accent"
                  : "border-border text-text-secondary hover:text-text-primary"
              }`}
            >
              <History size={12} /> History
            </button>
          </div>
        </div>

        {/* History panel */}
        {showHistory ? (
          <div className="flex-1 flex overflow-hidden">
            {/* Backup list */}
            <div className="w-56 flex-shrink-0 border-r border-border overflow-y-auto">
              <div className="p-3 border-b border-border">
                <p className="text-xs text-text-secondary uppercase tracking-wider">
                  Saved versions · {activeFormat}
                </p>
              </div>
              {backupsLoading ? (
                <div className="p-4 text-xs text-text-secondary">Loading…</div>
              ) : backups.length === 0 ? (
                <div className="p-4 text-xs text-text-secondary">
                  No saved versions yet. Versions are created each time you save a draft.
                </div>
              ) : (
                <div className="py-1">
                  {backups.map((b) => (
                    <button
                      key={b.filename}
                      onClick={() => loadBackupPreview(b.filename)}
                      className={`w-full text-left px-4 py-3 border-b border-border/50 last:border-0 transition-colors ${
                        previewBackup?.filename === b.filename
                          ? "bg-accent/10 text-text-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface/50"
                      }`}
                    >
                      <p className="text-xs font-medium">{formatBackupTime(b.savedAt)}</p>
                      <p className="text-[10px] font-mono text-text-secondary/60 mt-0.5">
                        {new Date(b.savedAt).toLocaleString("en-US", {
                          month: "short", day: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Preview pane */}
            <div className="flex-1 flex flex-col min-w-0">
              {previewBackup ? (
                <>
                  <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-warning/5">
                    <span className="text-xs text-warning">Previewing a saved version — not your current draft</span>
                    <button
                      onClick={restoreBackup}
                      className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
                    >
                      <CornerUpLeft size={12} /> Restore this version
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-3xl mx-auto prose prose-invert prose-stone prose-sm">
                      <ReactMarkdown>{previewBackup.content}</ReactMarkdown>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-text-secondary text-sm">
                  Select a version on the left to preview it
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Normal editor / preview */
          <div className="flex-1 overflow-hidden">
            {draftLoading ? (
              <div className="p-6 text-text-secondary text-sm">Loading…</div>
            ) : preview ? (
              <div className="h-full overflow-y-auto p-8">
                <div className="max-w-3xl mx-auto prose prose-invert prose-stone prose-sm">
                  {localDraft ? (
                    <ReactMarkdown>{localDraft}</ReactMarkdown>
                  ) : (
                    <p className="text-text-secondary italic">Nothing written yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <textarea
                value={localDraft}
                onChange={(e) => setLocalDraft(e.target.value)}
                onBlur={() => saveDraft(localDraft)}
                placeholder={`Write your ${activeFormat === "research" ? "research brief" : activeFormat + " draft"} here in markdown…`}
                className="w-full h-full bg-transparent text-text-primary text-sm font-mono leading-relaxed p-8 resize-none focus:outline-none placeholder:text-text-secondary/40"
                spellCheck
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentPipeline() {
  const { content, archive, angles, loading, addContent, updateContent, deleteContent, archivePiece, restorePiece } =
    useContent();
  const [viewMode, setViewMode] = useState<"board" | "list" | "archive">("board");
  const [filterAngle, setFilterAngle] = useState("all");
  const [filterChannel, setFilterChannel] = useState("all");
  const [showAdd, setShowAdd] = useState(false);
  const [studioPiece, setStudioPiece] = useState<ContentPiece | null>(null);
  const [newPiece, setNewPiece] = useState({ title: "", angle: "" });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filtered = content
    .filter((c) => filterAngle === "all" || c.angle === filterAngle)
    .filter((c) => filterChannel === "all" || c.formats[filterChannel as keyof typeof c.formats]?.status !== "not-started");

  const getAngleColor = (angleName: string) =>
    angles.find((a) => a.name === angleName)?.color || "#666";

  const handleAdd = async () => {
    if (!newPiece.title.trim()) return;
    await addContent({ title: newPiece.title, angle: newPiece.angle });
    setNewPiece({ title: "", angle: "" });
    setShowAdd(false);
    toast.success("Content idea added");
  };

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination || destination.droppableId === source.droppableId) return;
    const newStage = destination.droppableId as ContentPiece["stage"];
    await updateContent(draggableId, { stage: newStage });
    if (newStage === "published") {
      const publishedCount = content.filter((c) => c.stage === "published").length + 1;
      if (publishedCount > PUBLISHED_CAP) {
        toast.success(`Stage updated — oldest published piece auto-archived`);
      } else {
        toast.success("Stage updated");
      }
    } else {
      toast.success("Stage updated");
    }
  };

  if (loading && content.length === 0 && archive.length === 0) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-64" />)}
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
          <span className="flex items-center gap-1.5"><Plus size={16} /> New Idea</span>
        </Button>
      </div>

      {/* View + angle filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex bg-surface rounded-lg border border-border overflow-hidden">
          {(["board", "list", "archive"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm capitalize transition-colors flex items-center gap-1.5 ${
                viewMode === mode ? "bg-accent text-white" : "text-text-secondary"
              }`}
            >
              {mode === "archive" && <Archive size={13} />}
              {mode === "archive" ? `Archive (${archive.length})` : mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
        {viewMode !== "archive" && (
          <div className="space-y-2">
            {/* Angle filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary w-14 flex-shrink-0">Angle</span>
              <button
                onClick={() => setFilterAngle("all")}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterAngle === "all" ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"}`}
              >
                All
              </button>
              {angles.map((angle) => (
                <button
                  key={angle.id}
                  onClick={() => setFilterAngle(angle.name)}
                  className="px-3 py-1.5 text-xs rounded-full transition-colors"
                  style={{
                    backgroundColor: filterAngle === angle.name ? angle.color + "33" : undefined,
                    color: filterAngle === angle.name ? angle.color : "#A8A29E",
                  }}
                >
                  {angle.name}
                </button>
              ))}
            </div>
            {/* Channel filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-text-secondary w-14 flex-shrink-0">Channel</span>
              <button
                onClick={() => setFilterChannel("all")}
                className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterChannel === "all" ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"}`}
              >
                All
              </button>
              {(["linkedin", "youtube", "email", "twitter", "instagram"] as const).map((ch) => {
                const labels: Record<string, string> = {
                  linkedin: "LinkedIn", youtube: "YouTube", email: "Email",
                  twitter: "Twitter/X", instagram: "Instagram",
                };
                return (
                  <button
                    key={ch}
                    onClick={() => setFilterChannel(filterChannel === ch ? "all" : ch)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full transition-colors ${
                      filterChannel === ch ? "bg-accent/20 text-accent" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    {formatIcons[ch]}
                    {labels[ch]}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
              options={[{ value: "", label: "Select angle..." }, ...angles.map((a) => ({ value: a.name, label: a.name }))]}
            />
            <Button onClick={handleAdd}>Add</Button>
            <Button variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </Card>
      )}

      {/* ── Archive View ── */}
      {viewMode === "archive" && (
        <div className="space-y-3">
          {archive.length === 0 ? (
            <EmptyState
              icon={<Archive size={48} />}
              title="Archive is empty"
              description="Published pieces auto-archive when the Published column exceeds 6. You can also archive manually from the Studio."
            />
          ) : (
            archive.map((piece) => (
              <div
                key={piece.id}
                className="flex items-center gap-4 bg-surface border border-border rounded-lg p-4 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-text-secondary">{piece.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {piece.angle && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: getAngleColor(piece.angle) + "33",
                          color: getAngleColor(piece.angle),
                        }}
                      >
                        {piece.angle}
                      </span>
                    )}
                    <span className="text-xs font-mono text-text-secondary">{piece.stage}</span>
                    {piece.publishedAt && (
                      <span className="text-xs font-mono text-text-secondary">
                        Published {new Date(piece.publishedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={async () => {
                      await restorePiece(piece.id);
                      toast.success("Restored to Ready stage");
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-text-primary hover:border-accent/30 transition-colors"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                  {deleteConfirmId === piece.id ? (
                    <div className="flex gap-1">
                      <button
                        onClick={async () => {
                          await deleteContent(piece.id, "archive");
                          setDeleteConfirmId(null);
                          toast.success("Permanently deleted");
                        }}
                        className="px-3 py-1.5 text-xs rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1.5 text-xs rounded-lg border border-border text-text-secondary transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirmId(piece.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg border border-border text-text-secondary hover:text-danger hover:border-danger/30 transition-colors"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Board View ── */}
      {viewMode === "board" && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-5 gap-3">
            {stageColumns.map((stage) => {
              const stagePieces = filtered.filter((c) => c.stage === stage.id);
              const isPublished = stage.id === "published";
              return (
                <Droppable droppableId={stage.id} key={stage.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`rounded-xl border border-border p-3 min-h-[120px] transition-colors ${
                        snapshot.isDraggingOver ? "bg-accent/10 border-accent/30" : "bg-surface/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-medium">{stage.label}</h3>
                        <div className="flex items-center gap-1">
                          <Badge color={isPublished && stagePieces.length >= PUBLISHED_CAP ? "warning" : "muted"}>
                            {stagePieces.length}{isPublished ? `/${PUBLISHED_CAP}` : ""}
                          </Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {stagePieces.map((piece, index) => (
                          <Draggable draggableId={piece.id} index={index} key={piece.id}>
                            {(dragProvided, dragSnapshot) => (
                              <div
                                ref={dragProvided.innerRef}
                                {...dragProvided.draggableProps}
                                {...dragProvided.dragHandleProps}
                                onClick={() => !dragSnapshot.isDragging && setStudioPiece(piece)}
                                className={`bg-surface border border-border rounded-lg p-3 cursor-pointer transition-colors select-none group ${
                                  dragSnapshot.isDragging
                                    ? "shadow-xl border-accent/40 rotate-1"
                                    : "hover:border-accent/30"
                                }`}
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
                                <div className="flex items-center justify-between">
                                  <div className="flex gap-2 flex-wrap">
                                    {Object.entries(piece.formats).map(([format, data]) => (
                                      <div key={format} className="flex items-center gap-1" title={`${format}: ${data.status}`}>
                                        {formatIcons[format]}
                                        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[data.status] || "bg-text-secondary/30"}`} />
                                      </div>
                                    ))}
                                  </div>
                                  <ChevronRight size={12} className="text-text-secondary/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                {/* Quick archive on published cards */}
                                {isPublished && !dragSnapshot.isDragging && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      await archivePiece(piece.id);
                                      toast.success("Archived");
                                    }}
                                    className="mt-2 w-full flex items-center justify-center gap-1 text-[10px] text-text-secondary hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Archive size={10} /> Archive
                                  </button>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    </div>
                  )}
                </Droppable>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* ── List View ── */}
      {viewMode === "list" && (
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<FileText size={48} />}
              title="No content yet"
              description="Add your first content idea"
              action={
                <Button onClick={() => setShowAdd(true)}>
                  <span className="flex items-center gap-1.5"><Plus size={14} /> New Idea</span>
                </Button>
              }
            />
          ) : (
            filtered
              .sort((a, b) => a.weekNumber - b.weekNumber)
              .map((piece) => (
                <div
                  key={piece.id}
                  onClick={() => setStudioPiece(piece)}
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
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(piece.formats).map(([format, data]) => (
                      <div key={format} className="flex items-center gap-1" title={`${format}: ${data.status}`}>
                        {formatIcons[format]}
                        <div className={`w-1.5 h-1.5 rounded-full ${statusColors[data.status] || "bg-text-secondary/30"}`} />
                      </div>
                    ))}
                  </div>
                  <ChevronRight size={14} className="text-text-secondary/40 flex-shrink-0" />
                </div>
              ))
          )}
        </div>
      )}

      {/* ── Content Studio overlay ── */}
      {studioPiece && (
        <Studio
          piece={studioPiece}
          angles={angles}
          onClose={() => setStudioPiece(null)}
          onSave={async (id, updates) => {
            await updateContent(id, updates);
          }}
          onDelete={async () => {
            await deleteContent(studioPiece.id);
            toast.success("Deleted");
            setStudioPiece(null);
          }}
          onArchive={
            studioPiece.stage === "published"
              ? async () => {
                  await archivePiece(studioPiece.id);
                  toast.success("Archived");
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
