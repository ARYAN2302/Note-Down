import { Pin, Users } from "lucide-react";

import { TagBadge } from "./TagBadge";

function relativeTime(value) {
  if (!value) return "Now";
  const delta = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(delta / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NoteCard({ note, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg px-3 py-3 text-left transition ${
        selected
          ? "bg-white shadow-sm ring-1 ring-slate-900/10"
          : "bg-transparent hover:bg-white/80"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-slate-900">{note.title || "Untitled note"}</div>
          <div className="mt-2 line-clamp-2 text-xs text-slate-500">
            {note.content || "No content yet"}
          </div>
        </div>
        <div className="flex items-center gap-2 text-slate-400">
          {note.shared_by ? <Users className="h-4 w-4 shrink-0" /> : null}
          {note.is_pinned ? <Pin className="h-4 w-4 shrink-0" /> : null}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {note.tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag.id} tag={tag} />
        ))}
      </div>
      <div className="mt-3 text-[11px] text-slate-500">
        {note.shared_by ? `Shared by ${note.shared_by} • ` : ""}
        {relativeTime(note.updated_at)}
      </div>
    </button>
  );
}
