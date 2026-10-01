import { create } from 'zustand';
import api from '../api/axios';

const useAuthStore = create((set) => ({
  user: null, isAuthenticated: false, isLoading: true, error: null,

  checkAuth: async () => {
    try { const { data } = await api.get('/auth/me'); set({ user: data.data.user, isAuthenticated: true, isLoading: false }); }
    catch { set({ user: null, isAuthenticated: false, isLoading: false }); }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try { const { data } = await api.post('/auth/login', { email, password }); set({ user: data.data.user, isAuthenticated: true, isLoading: false }); return data; }
    catch (err) { const msg = err.response?.data?.message || 'Login failed'; set({ isLoading: false, error: msg }); throw new Error(msg); }
  },

  logout: async () => { try { await api.post('/auth/logout'); } catch {} set({ user: null, isAuthenticated: false }); },

  // Update profile — supports FormData for avatar file upload
  updateProfile: async (payload) => {
    let headers = {};
    if (payload instanceof FormData) {
      headers['Content-Type'] = 'multipart/form-data';
    }
    const { data: res } = await api.put('/users/profile', payload, { headers });
    set({ user: res.data.user });
    return res;
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
