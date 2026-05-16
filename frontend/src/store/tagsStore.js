import { create } from "zustand";
import { tagsApi } from "../api";

export const useTagsStore = create((set) => ({
  tags: [],
  refresh: async () => {
    const tags = await tagsApi.list();
    set({ tags });
  },
  createTag: async (payload) => {
    const tag = await tagsApi.create(payload);
    set((state) => ({ tags: [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name)) }));
    return tag;
  },
  updateTag: async (id, payload) => {
    const tag = await tagsApi.update(id, payload);
    set((state) => ({ tags: state.tags.map((item) => (item.id === id ? tag : item)) }));
    return tag;
  },
  deleteTag: async (id) => {
    await tagsApi.remove(id);
    set((state) => ({ tags: state.tags.filter((item) => item.id !== id) }));
  }
}));
