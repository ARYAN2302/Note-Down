import {
  Archive,
  Clock3,
  CopyPlus,
  LoaderCircle,
  Pin,
  RotateCcw,
  Save,
  Share2,
  Trash2
} from "lucide-react";

import { AIToolbar } from "./AIToolbar";
import { TagBadge } from "./TagBadge";

export function NoteEditor({
  note,
  draft,
  availableTags,
  busy,
  aiState,
  onDraftChange,
  onSave,
  onToggleTag,
  onPin,
  onArchive,
  onRestore,
  onDelete,
  onDuplicate,
  onOpenHistory,
  onOpenShare,
  onSummarise,
  onSuggestTags,
  onContinueWriting,
  onApplySuggestion
}) {
  const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(words / 200));
  const disabled = busy === "loading";

  if (!note && !draft) {
    return (
      <div className="panel flex h-full items-center justify-center p-8 text-sm text-slate-500">
        Pick a note or create one to start writing.
      </div>
    );
  }

  const current = draft;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[20px] bg-paper">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-7 py-5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <input
            value={current.title}
            onChange={(event) => onDraftChange({ title: event.target.value })}
            className="w-full bg-transparent text-[2rem] font-semibold tracking-tight text-slate-900"
            placeholder="Untitled note"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onSave}
            disabled={disabled || busy === "save"}
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            title="Save note"
            aria-label="Save note"
          >
            {busy === "save" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save</span>
          </button>
          <button type="button" onClick={onOpenHistory} disabled={!note?.id} className="icon-button" title="Version history" aria-label="Version history">
            <Clock3 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onOpenShare} disabled={!note?.id} className="icon-button" title="Share note" aria-label="Share note">
            <Share2 className="h-4 w-4" />
          </button>
          <button type="button" onClick={onPin} disabled={!note?.id} className="icon-button" title={note?.is_pinned ? "Unpin note" : "Pin note"} aria-label={note?.is_pinned ? "Unpin note" : "Pin note"}>
            <Pin className={`h-4 w-4 ${note?.is_pinned ? "fill-current" : ""}`} />
          </button>
          <button type="button" onClick={onDuplicate} disabled={!note?.id} className="icon-button" title="Duplicate note" aria-label="Duplicate note">
            <CopyPlus className="h-4 w-4" />
          </button>
          {note?.status === "trashed" || note?.status === "archived" ? (
            <button type="button" onClick={onRestore} disabled={!note?.id} className="icon-button" title="Restore note" aria-label="Restore note">
              <RotateCcw className="h-4 w-4" />
            </button>
          ) : (
            <button type="button" onClick={onArchive} disabled={!note?.id} className="icon-button" title="Archive note" aria-label="Archive note">
              <Archive className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={onDelete} disabled={!note?.id} className="icon-button" title="Delete note" aria-label="Delete note">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-7 py-6">
        <textarea
          value={current.content}
          onChange={(event) => onDraftChange({ content: event.target.value })}
          placeholder="Start writing..."
          className="min-h-[520px] w-full resize-none bg-transparent text-[15px] leading-8 text-slate-700"
        />
      </div>

      <div className="border-t border-line/70 bg-[#faf7f0] px-7 py-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {availableTags.map((tag) => {
            const active = current.tags.some((item) => item.id === tag.id);
            return <TagBadge key={tag.id} tag={tag} active={active} onClick={() => onToggleTag(tag)} />;
          })}
        </div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div>{words} words</div>
          <div>{readTime} min read</div>
        </div>
        <AIToolbar
          disabled={!note?.id}
          loadingAction={aiState.loadingAction}
          result={aiState.result}
          onSummarise={onSummarise}
          onSuggestTags={onSuggestTags}
          onContinueWriting={onContinueWriting}
          onApplySuggestion={onApplySuggestion}
        />
      </div>
    </div>
  );
}
