/**
 * Admin Axios API Instance
 * Same cross-origin CSRF strategy as the customer frontend.
 */
import axios from 'axios';

// ─── CSRF Token Store (in-memory) ────────────────────────────────────────────
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

function getCsrfToken() {
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(^| )csrf-token=([^;]+)/);
  return match ? match[2] : null;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Attach CSRF token ───────────────────────────────────
api.interceptors.request.use((config) => {
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  if (mutatingMethods.includes(config.method)) {
    const token = getCsrfToken();
    if (token) {
      config.headers['X-CSRF-Token'] = token;
    }
  }
  return config;
});

// ── Response Interceptor ─────────────────────────────────────────────────────
let isRefreshing = false;
let failedQueue = [];
const processQueue = (error) => {
  failedQueue.forEach((p) => { if (error) p.reject(error); else p.resolve(); });
  failedQueue = [];
};

const skipRefreshPaths = ['/auth/login', '/auth/refresh', '/auth/me', '/auth/register'];

api.interceptors.response.use(
  (res) => {
    // Capture CSRF token from any response that includes it
    if (res.data?.csrfToken) {
      setCsrfToken(res.data.csrfToken);
    }
    return res;
  },
  async (error) => {
    const orig = error.config;
    const url = orig?.url || '';
    if (error.response?.status === 401 && !orig._retry) {
      if (skipRefreshPaths.some((p) => url.includes(p))) return Promise.reject(error);
      if (isRefreshing) return new Promise((resolve, reject) => { failedQueue.push({ resolve, reject }); }).then(() => api(orig));
      orig._retry = true;
      isRefreshing = true;
      try {
        const refreshRes = await api.post('/auth/refresh');
        if (refreshRes.data?.csrfToken) {
          setCsrfToken(refreshRes.data.csrfToken);
        }
        processQueue(null);
        return api(orig);
      }
      catch (e) { processQueue(e); return Promise.reject(e); }
      finally { isRefreshing = false; }
    }
    return Promise.reject(error);
  }
);

export default api;
