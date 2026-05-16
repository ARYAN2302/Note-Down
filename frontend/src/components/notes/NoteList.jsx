import { Archive, ChevronDown, NotebookPen, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

import { NoteCard } from "./NoteCard";
import { TagBadge } from "./TagBadge";

export function NoteList({
  notes,
  archivedNotes,
  trashedNotes,
  selectedNoteId,
  searchQuery,
  onSearchChange,
  onCreateNote,
  tags,
  activeTagIds,
  onToggleTag,
  searchMode,
  onSearchModeChange,
  loading,
  onSelect
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [showTrash, setShowTrash] = useState(false);

  const filterByTags = (list) =>
    !activeTagIds.length
      ? list
      : list.filter((note) => activeTagIds.every((tagId) => note.tags.some((tag) => tag.id === tagId)));

  const activeNotes = useMemo(() => filterByTags(notes), [notes, activeTagIds]);
  const archived = useMemo(() => filterByTags(archivedNotes), [archivedNotes, activeTagIds]);
  const trashed = useMemo(() => filterByTags(trashedNotes), [trashedNotes, activeTagIds]);

  return (
    <aside className="flex h-full w-full flex-col gap-4">
      <div className="rounded-2xl bg-[#f2ede4] p-4">
        <div className="flex items-center gap-2 rounded-xl bg-white/80 px-3 py-2.5 shadow-sm">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full bg-transparent text-sm"
            placeholder="Search notes"
          />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSearchModeChange("full_text")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              searchMode === "full_text" ? "bg-slate-900 text-white" : "bg-white/80 text-slate-600"
            }`}
          >
            Full text
          </button>
          <button
            type="button"
            onClick={() => onSearchModeChange("semantic")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium ${
              searchMode === "semantic" ? "bg-slate-900 text-white" : "bg-white/80 text-slate-600"
            }`}
          >
            Semantic
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <TagBadge
              key={tag.id}
              tag={tag}
              active={activeTagIds.includes(tag.id)}
              onClick={() => onToggleTag(tag.id)}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onCreateNote}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#ffd65a] px-4 py-3 text-sm font-medium text-slate-900 transition hover:brightness-95"
      >
        <NotebookPen className="h-4 w-4" />
        <span>New note</span>
      </button>

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto pr-1">
        <section className="space-y-2">
          {loading ? <div className="px-1 text-sm text-slate-500">Loading notes...</div> : null}
          {activeNotes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              selected={selectedNoteId === note.id}
              onSelect={() => onSelect(note.id)}
            />
          ))}
          {!loading && !activeNotes.length ? <div className="px-1 text-sm text-slate-500">No active notes yet.</div> : null}
        </section>

        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowArchived((value) => !value)}
            className="flex w-full items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
          >
            <span className="inline-flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Archived
            </span>
            <ChevronDown className={`h-4 w-4 transition ${showArchived ? "rotate-180" : ""}`} />
          </button>
          {showArchived ? archived.map((note) => <NoteCard key={note.id} note={note} selected={selectedNoteId === note.id} onSelect={() => onSelect(note.id)} />) : null}
        </section>

        <section className="space-y-2">
          <button
            type="button"
            onClick={() => setShowTrash((value) => !value)}
            className="flex w-full items-center justify-between px-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500"
          >
            <span className="inline-flex items-center gap-2">
              <Trash2 className="h-4 w-4" />
              Trash
            </span>
            <ChevronDown className={`h-4 w-4 transition ${showTrash ? "rotate-180" : ""}`} />
          </button>
          {showTrash ? trashed.map((note) => <NoteCard key={note.id} note={note} selected={selectedNoteId === note.id} onSelect={() => onSelect(note.id)} />) : null}
        </section>
      </div>
    </aside>
  );
}
