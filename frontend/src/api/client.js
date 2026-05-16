import axios from "axios";
import { useAuthStore } from "../store/authStore";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

export const publicApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (!error.response || !originalRequest) {
      return Promise.reject(error);
    }

    const isRefreshRequest = originalRequest.url?.includes("/refresh");
    const isAuthRequest = ["/login", "/register"].some((path) => originalRequest.url?.includes(path));

    if (error.response.status === 401 && !originalRequest._retry && !isRefreshRequest && !isAuthRequest) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await publicApi.post("/refresh");
        useAuthStore.getState().setToken(refreshResponse.data.access_token);
        originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout({ silent: true });
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export { API_BASE_URL };
