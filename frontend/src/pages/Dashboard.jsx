import { useEffect, useMemo, useState } from "react";

import { notesApi } from "../api";
import { AppShell } from "../components/layout/AppShell";
import { NoteEditor } from "../components/notes/NoteEditor";
import { NoteList } from "../components/notes/NoteList";
import { ShareModal } from "../components/notes/ShareModal";
import { VersionHistory } from "../components/notes/VersionHistory";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
import { emptyDraft, useNotesStore } from "../store/notesStore";
import { useAuthStore } from "../store/authStore";
import { useTagsStore } from "../store/tagsStore";

function normalizeError(error, fallback) {
  return error.response?.data?.detail || error.response?.data?.message || fallback;
}

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const notes = useNotesStore((state) => state.notes);
  const archivedNotes = useNotesStore((state) => state.archivedNotes);
  const trashedNotes = useNotesStore((state) => state.trashedNotes);
  const selectedNoteId = useNotesStore((state) => state.selectedNoteId);
  const loading = useNotesStore((state) => state.loading);
  const refresh = useNotesStore((state) => state.refresh);
  const setSelectedNote = useNotesStore((state) => state.setSelectedNote);
  const selectFreshNote = useNotesStore((state) => state.selectFreshNote);
  const upsertNote = useNotesStore((state) => state.upsertNote);
  const removeNoteLocally = useNotesStore((state) => state.removeNoteLocally);
  const search = useNotesStore((state) => state.search);
  const searchMode = useNotesStore((state) => state.searchMode);
  const setSearchMode = useNotesStore((state) => state.setSearchMode);
  const tags = useTagsStore((state) => state.tags);
  const refreshTags = useTagsStore((state) => state.refresh);
  const createTag = useTagsStore((state) => state.createTag);
  const deleteTag = useTagsStore((state) => state.deleteTag);

  const [draft, setDraft] = useState(emptyDraft);
  const [busy, setBusy] = useState("");
  const [feedback, setFeedback] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTagIds, setActiveTagIds] = useState([]);
  const [shareOpen, setShareOpen] = useState(false);
  const [shares, setShares] = useState([]);
  const [publicLink, setPublicLink] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [versions, setVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [aiState, setAiState] = useState({ loadingAction: "", result: null });

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  const allNotes = useMemo(() => [...notes, ...archivedNotes, ...trashedNotes], [notes, archivedNotes, trashedNotes]);
  const selectedNote = useMemo(
    () => (selectedNoteId === "draft" ? null : allNotes.find((note) => note.id === selectedNoteId) || null),
    [allNotes, selectedNoteId]
  );

  useEffect(() => {
    async function bootstrap() {
      try {
        await Promise.all([refresh(), refreshTags()]);
      } catch (error) {
        setFeedback(normalizeError(error, "Unable to load notes"));
      }
    }
    bootstrap();
  }, [refresh, refreshTags]);

  useEffect(() => {
    if (selectedNoteId === "draft") {
      setDraft(emptyDraft);
      return;
    }
    if (selectedNote) {
      setDraft({ ...selectedNote, isDraft: false });
    }
  }, [selectedNote, selectedNoteId]);

  useEffect(() => {
    async function runSearch() {
      try {
        await search(debouncedSearch);
      } catch (error) {
        setFeedback(normalizeError(error, "Search failed"));
      }
    }
    runSearch();
  }, [debouncedSearch, search, searchMode]);

  const saveNote = async () => {
    if (!draft.title.trim()) {
      setFeedback("Title must not be empty.");
      return;
    }
    setBusy("save");
    setFeedback("");
    try {
      let saved;
      if (selectedNoteId === "draft" || !draft.id) {
        saved = await notesApi.create({
          title: draft.title,
          content: draft.content,
          tag_ids: draft.tags.map((tag) => tag.id)
        });
      } else {
        saved = await notesApi.update(draft.id, {
          title: draft.title,
          content: draft.content,
          tag_ids: draft.tags.map((tag) => tag.id)
        });
      }
      upsertNote(saved);
      setSelectedNote(saved.id);
      setDraft({ ...saved, isDraft: false });
      await refresh();
      setFeedback("Saved.");
    } catch (error) {
      setFeedback(normalizeError(error, "Save failed"));
    } finally {
      setBusy("");
    }
  };

  const withNote = async (callback) => {
    if (!draft.id) return;
    try {
      await callback(draft.id);
      await refresh();
    } catch (error) {
      setFeedback(normalizeError(error, "Action failed"));
    }
  };

  const handleToggleTag = async (tag) => {
    const active = draft.tags.some((item) => item.id === tag.id);
    if (!draft.id) {
      setDraft((current) => ({
        ...current,
        tags: active ? current.tags.filter((item) => item.id !== tag.id) : [...current.tags, tag]
      }));
      return;
    }

    setBusy("tag");
    try {
      const updated = active ? await notesApi.removeTag(draft.id, tag.id) : await notesApi.addTags(draft.id, [tag.id]);
      upsertNote(updated);
      setDraft({ ...updated, isDraft: false });
      await refresh();
    } catch (error) {
      setFeedback(normalizeError(error, "Tag update failed"));
    } finally {
      setBusy("");
    }
  };

  const handleApplySuggestion = async (suggestion) => {
    try {
      let tag = tags.find((item) => item.name.toLowerCase() === suggestion.toLowerCase());
      if (!tag) {
        tag = await createTag({ name: suggestion, color: "#0f766e" });
      }
      await handleToggleTag(tag);
    } catch (error) {
      setFeedback(normalizeError(error, "Unable to apply suggested tag"));
    }
  };

  const runAiAction = async (type, request) => {
    if (!draft.id) return;
    setAiState({ loadingAction: type, result: null });
    try {
      const response = await request(draft.id);
      if (type === "summarise") {
        setAiState({ loadingAction: "", result: { type: "summary", value: response.summary } });
      } else if (type === "suggest-tags") {
        setAiState({ loadingAction: "", result: { type: "suggestions", value: response.suggestions } });
      } else if (type === "continue") {
        const nextContent = draft.content ? `${draft.content}\n\n${response.continuation}` : response.continuation;
        setDraft((current) => ({ ...current, content: nextContent }));
        setAiState({ loadingAction: "", result: { type: "message", value: "Continuation appended to your draft." } });
      }
    } catch (error) {
      setAiState({ loadingAction: "", result: { type: "message", value: normalizeError(error, "AI request failed") } });
    }
  };

  const openShareModal = async () => {
    if (!draft.id) return;
    setShareOpen(true);
    try {
      const currentShares = await notesApi.shares(draft.id);
      setShares(currentShares);
    } catch (error) {
      setFeedback(normalizeError(error, "Unable to load shares"));
    }
  };

  const openHistoryDrawer = async () => {
    if (!draft.id) return;
    setHistoryOpen(true);
    setBusy("history");
    try {
      const list = await notesApi.history(draft.id);
      setVersions(list);
      if (list[0]) {
        const detail = await notesApi.historyVersion(draft.id, list[0].version_num);
        setSelectedVersion(detail);
      }
    } catch (error) {
      setFeedback(normalizeError(error, "Unable to load version history"));
    } finally {
      setBusy("");
    }
  };

  return (
    <AppShell user={user} onLogout={() => logout()}>
      {feedback ? <div className="mb-4 rounded-xl bg-amberSoft px-4 py-2.5 text-sm text-amber-900">{feedback}</div> : null}
      <div className="grid flex-1 gap-5 lg:grid-cols-[330px_minmax(0,1fr)]">
        <div className="min-h-0">
          <NoteList
            notes={notes}
            archivedNotes={archivedNotes}
            trashedNotes={trashedNotes}
            selectedNoteId={selectedNoteId}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onCreateNote={() => {
              selectFreshNote();
              setDraft(emptyDraft);
            }}
            tags={tags}
            activeTagIds={activeTagIds}
            onToggleTag={(tagId) =>
              setActiveTagIds((current) => (current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId]))
            }
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            loading={loading}
            onSelect={setSelectedNote}
          />
          <div className="mt-4 rounded-2xl border border-line/70 bg-[#f2ede4] p-4">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Tag studio</div>
            <TagManager
              tags={tags}
              onCreate={createTag}
              onDelete={deleteTag}
              onUseTag={(tag) => handleToggleTag(tag)}
            />
          </div>
        </div>

        <div className="min-h-0">
          <NoteEditor
            note={selectedNote}
            draft={draft}
            availableTags={tags}
            busy={busy}
            aiState={aiState}
            onDraftChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
            onSave={saveNote}
            onToggleTag={handleToggleTag}
            onPin={() => withNote(async (id) => {
              const updated = await notesApi.pin(id);
              upsertNote(updated);
              setDraft({ ...updated, isDraft: false });
            })}
            onArchive={() => withNote(async (id) => {
              const updated = await notesApi.archive(id);
              upsertNote(updated);
              setDraft({ ...updated, isDraft: false });
            })}
            onRestore={() => withNote(async (id) => {
              const updated = await notesApi.restore(id);
              upsertNote(updated);
              setDraft({ ...updated, isDraft: false });
            })}
            onDelete={() => withNote(async (id) => {
              await notesApi.remove(id);
              removeNoteLocally(id);
              await refresh();
            })}
            onDuplicate={() => withNote(async (id) => {
              const duplicated = await notesApi.duplicate(id);
              upsertNote(duplicated);
              setSelectedNote(duplicated.id);
              setDraft({ ...duplicated, isDraft: false });
              await refresh();
            })}
            onOpenHistory={openHistoryDrawer}
            onOpenShare={openShareModal}
            onSummarise={() => runAiAction("summarise", notesApi.summarise)}
            onSuggestTags={() => runAiAction("suggest-tags", notesApi.suggestTags)}
            onContinueWriting={() => runAiAction("continue", notesApi.continueWriting)}
            onApplySuggestion={handleApplySuggestion}
          />
        </div>
      </div>

      <ShareModal
        open={shareOpen}
        shares={shares}
        publicLink={publicLink}
        busy={busy === "share"}
        onClose={() => setShareOpen(false)}
        onSubmitShare={async (payload) => {
          if (!draft.id) return;
          setBusy("share");
          try {
            await notesApi.share(draft.id, payload);
            setShares(await notesApi.shares(draft.id));
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to share note"));
          } finally {
            setBusy("");
          }
        }}
        onRevokeShare={async (share) => {
          if (!draft.id) return;
          setBusy("share");
          try {
            await notesApi.revokeShare(draft.id, share.user_id);
            setShares(await notesApi.shares(draft.id));
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to revoke share"));
          } finally {
            setBusy("");
          }
        }}
        onEnablePublicLink={async () => {
          if (!draft.id) return;
          setBusy("share");
          try {
            const link = await notesApi.createPublicLink(draft.id);
            setPublicLink(link);
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to create public link"));
          } finally {
            setBusy("");
          }
        }}
        onDisablePublicLink={async () => {
          if (!draft.id) return;
          setBusy("share");
          try {
            await notesApi.revokePublicLink(draft.id);
            setPublicLink(null);
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to revoke public link"));
          } finally {
            setBusy("");
          }
        }}
      />

      <VersionHistory
        open={historyOpen}
        versions={versions}
        selectedVersion={selectedVersion}
        currentContent={draft.content}
        loading={busy === "history"}
        restoring={busy === "restore-version"}
        onClose={() => setHistoryOpen(false)}
        onSelectVersion={async (versionNum) => {
          if (!draft.id) return;
          setBusy("history");
          try {
            const detail = await notesApi.historyVersion(draft.id, versionNum);
            setSelectedVersion(detail);
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to load version"));
          } finally {
            setBusy("");
          }
        }}
        onRestore={async () => {
          if (!draft.id || !selectedVersion) return;
          setBusy("restore-version");
          try {
            const restored = await notesApi.restoreVersion(draft.id, selectedVersion.version_num);
            upsertNote(restored);
            setDraft({ ...restored, isDraft: false });
            await refresh();
          } catch (error) {
            setFeedback(normalizeError(error, "Unable to restore version"));
          } finally {
            setBusy("");
          }
        }}
      />
    </AppShell>
  );
}

function TagManager({ tags, onCreate, onDelete, onUseTag }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#0f766e");
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_60px_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="rounded-xl border border-line/80 bg-white/90 px-3 py-2.5 text-sm"
          placeholder="Create a tag"
        />
        <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="h-11 w-full rounded-xl border border-line/80 bg-white p-1" />
        <button
          type="button"
          onClick={async () => {
            if (!name.trim()) return;
            setBusy(true);
            try {
              await onCreate({ name: name.trim(), color });
              setName("");
            } finally {
              setBusy(false);
            }
          }}
          disabled={busy}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-800"
        >
          Add
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <div key={tag.id} className="flex items-center gap-2 rounded-full border border-transparent bg-white/80 px-2.5 py-1.5">
            <button type="button" onClick={() => onUseTag(tag)} className="inline-flex items-center gap-2 text-xs text-slate-700">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
              <span>{tag.name}</span>
            </button>
            <button type="button" onClick={() => onDelete(tag.id)} className="text-xs text-slate-400 hover:text-slate-900">
              x
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
