import { api, publicApi } from "./client";

export const authApi = {
  register: async (payload) => (await publicApi.post("/register", payload)).data,
  login: async (payload) => (await publicApi.post("/login", payload)).data,
  logout: async () => (await api.post("/logout")).data,
  refresh: async () => (await publicApi.post("/refresh")).data
};

export const notesApi = {
  list: async (params) => (await api.get("/notes", { params })).data,
  get: async (id) => (await api.get(`/notes/${id}`)).data,
  create: async (payload) => (await api.post("/notes", payload)).data,
  update: async (id, payload) => (await api.put(`/notes/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/notes/${id}`)).data,
  share: async (id, payload) => (await api.post(`/notes/${id}/share`, payload)).data,
  shares: async (id) => (await api.get(`/notes/${id}/shares`)).data,
  revokeShare: async (noteId, userId) => (await api.delete(`/notes/${noteId}/shares/${userId}`)).data,
  createPublicLink: async (id) => (await api.post(`/notes/${id}/public-link`)).data,
  revokePublicLink: async (id) => (await api.delete(`/notes/${id}/public-link`)).data,
  history: async (id) => (await api.get(`/notes/${id}/history`)).data,
  historyVersion: async (id, versionNum) => (await api.get(`/notes/${id}/history/${versionNum}`)).data,
  restoreVersion: async (id, versionNum) => (await api.post(`/notes/${id}/restore/${versionNum}`)).data,
  pin: async (id) => (await api.post(`/notes/${id}/pin`)).data,
  archive: async (id) => (await api.post(`/notes/${id}/archive`)).data,
  restore: async (id) => (await api.post(`/notes/${id}/restore`)).data,
  duplicate: async (id) => (await api.post(`/notes/${id}/duplicate`)).data,
  addTags: async (id, tagIds) => (await api.post(`/notes/${id}/tags`, { tag_ids: tagIds })).data,
  removeTag: async (id, tagId) => (await api.delete(`/notes/${id}/tags/${tagId}`)).data,
  summarise: async (id) => (await api.post(`/notes/${id}/summarise`)).data,
  suggestTags: async (id) => (await api.post(`/notes/${id}/suggest-tags`)).data,
  continueWriting: async (id) => (await api.post(`/notes/${id}/continue`)).data
};

export const tagsApi = {
  list: async () => (await api.get("/tags")).data,
  create: async (payload) => (await api.post("/tags", payload)).data,
  update: async (id, payload) => (await api.put(`/tags/${id}`, payload)).data,
  remove: async (id) => (await api.delete(`/tags/${id}`)).data
};

export const searchApi = {
  query: async (q, mode = "full_text") => (await api.get("/search", { params: { q, mode } })).data
};

export const miscApi = {
  about: async () => (await publicApi.get("/about")).data,
  sharedNote: async (token) => (await publicApi.get(`/shared/${token}`)).data
};
