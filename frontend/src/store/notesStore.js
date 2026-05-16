import { create } from "zustand";
import { notesApi, searchApi } from "../api";

export const emptyDraft = {
  id: null,
  title: "",
  content: "",
  tags: [],
  status: "active",
  is_pinned: false,
  shared_by: null,
  created_at: null,
  updated_at: null,
  isDraft: true
};

export const useNotesStore = create((set, get) => ({
  notes: [],
  archivedNotes: [],
  trashedNotes: [],
  selectedNoteId: null,
  searchMode: "full_text",
  loading: false,
  setSelectedNote: (noteId) => set({ selectedNoteId: noteId }),
  setSearchMode: (searchMode) => set({ searchMode }),
  refresh: async () => {
    set({ loading: true });
    try {
      const [active, archived, trashed] = await Promise.all([
        notesApi.list({ status: "active" }),
        notesApi.list({ status: "archived" }),
        notesApi.list({ status: "trashed" })
      ]);
      const currentId = get().selectedNoteId;
      const allNotes = [...active.items, ...archived.items, ...trashed.items];
      const fallbackId = allNotes[0]?.id || null;
      set({
        notes: active.items,
        archivedNotes: archived.items,
        trashedNotes: trashed.items,
        selectedNoteId: allNotes.some((note) => note.id === currentId) ? currentId : fallbackId,
        loading: false
      });
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  },
  selectFreshNote: () => set({ selectedNoteId: "draft" }),
  upsertNote: (note) =>
    set((state) => {
      const groups = {
        active: "notes",
        archived: "archivedNotes",
        trashed: "trashedNotes"
      };
      const targetKey = groups[note.status] || "notes";
      const nextState = {
        notes: state.notes.filter((item) => item.id !== note.id),
        archivedNotes: state.archivedNotes.filter((item) => item.id !== note.id),
        trashedNotes: state.trashedNotes.filter((item) => item.id !== note.id)
      };
      nextState[targetKey] = [note, ...nextState[targetKey]];
      return nextState;
    }),
  removeNoteLocally: (noteId) =>
    set((state) => ({
      notes: state.notes.filter((item) => item.id !== noteId),
      archivedNotes: state.archivedNotes.filter((item) => item.id !== noteId),
      trashedNotes: state.trashedNotes.filter((item) => item.id !== noteId),
      selectedNoteId:
        state.selectedNoteId === noteId
          ? state.notes.find((item) => item.id !== noteId)?.id ||
            state.archivedNotes.find((item) => item.id !== noteId)?.id ||
            state.trashedNotes.find((item) => item.id !== noteId)?.id ||
            null
          : state.selectedNoteId
    })),
  search: async (query) => {
    if (!query.trim()) {
      await get().refresh();
      return;
    }
    set({ loading: true });
    const result = await searchApi.query(query, get().searchMode);
    set({
      notes: result,
      archivedNotes: [],
      trashedNotes: [],
      selectedNoteId: result[0]?.id || null,
      loading: false
    });
  }
}));
