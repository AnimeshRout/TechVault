import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

let isRefreshing = false;
let failedQueue = [];
const processQueue = (error) => {
  failedQueue.forEach((p) => { if (error) p.reject(error); else p.resolve(); });
  failedQueue = [];
};

// Routes that should NOT trigger a token refresh on 401
const skipRefreshPaths = ['/auth/login', '/auth/refresh', '/auth/me', '/auth/register'];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const orig = error.config;
    const url = orig?.url || '';
    if (error.response?.status === 401 && !orig._retry) {
      // Skip refresh for auth routes — just reject immediately
      if (skipRefreshPaths.some((p) => url.includes(p))) return Promise.reject(error);
      if (isRefreshing) return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); }).then(() => api(orig));
      orig._retry = true;
      isRefreshing = true;
      try { await api.post('/auth/refresh'); processQueue(null); return api(orig); }
      catch (e) { processQueue(e); return Promise.reject(e); }
      finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default api;
