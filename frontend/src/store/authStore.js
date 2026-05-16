import { create } from "zustand";
import { authApi } from "../api";

export const useAuthStore = create((set, get) => ({
  token: null,
  user: null,
  restoring: true,
  setToken: (token) => set((state) => ({ token, user: state.user || { email: null } })),
  login: async ({ email, password }) => {
    const data = await authApi.login({ email, password });
    set({ token: data.access_token, user: { email } });
    return data;
  },
  register: async ({ email, password }) => authApi.register({ email, password }),
  logout: async ({ silent = false } = {}) => {
    try {
      if (!silent && get().token) {
        await authApi.logout();
      }
    } finally {
      set({ token: null, user: null, restoring: false });
    }
  },
  restoreSession: async () => {
    try {
      const data = await authApi.refresh();
      set({ token: data.access_token, user: { email: null }, restoring: false });
    } catch (error) {
      set({ token: null, user: null, restoring: false });
    }
  }
}));
