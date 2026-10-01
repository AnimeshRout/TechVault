/**
 * Auth Store — Zustand
 * Manages user authentication state, login/register/logout flows.
 */
import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  // Check if user is already logged in (called on app mount)
  checkAuth: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user, isAuthenticated: true, isLoading: false, error: null });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/register', { name, email, password });
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Registration failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const { data } = await api.post('/auth/login', { email, password });
      set({ user: data.data.user, isAuthenticated: true, isLoading: false });
      return data;
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Clear state even if API fails
    }
    set({ user: null, isAuthenticated: false, error: null });
  },

  // Update profile — supports FormData for avatar file upload
  updateProfile: async (payload) => {
    let reqData;
    let headers = {};

    if (payload instanceof FormData) {
      reqData = payload;
      headers['Content-Type'] = 'multipart/form-data';
    } else {
      reqData = payload;
    }

    const { data: res } = await api.put('/users/profile', reqData, { headers });
    set({ user: res.data.user });
    return res;
  },

  // Refresh user data from server
  refreshUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.data.user });
    } catch {}
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
