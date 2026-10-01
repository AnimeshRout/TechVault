/**
 * Axios API Instance
 * Centralized HTTP client with interceptors for auth token refresh.
 *
 * CSRF Strategy (cross-origin safe):
 *   - On login/register/refresh, the backend returns { csrfToken } in the body
 *   - We store it in memory and attach as X-CSRF-Token header on mutating requests
 *   - The backend also sets a csrf-token cookie (auto-sent by browser)
 *   - Backend validates: cookie value === header value
 */
import axios from 'axios';

// ─── CSRF Token Store (in-memory) ────────────────────────────────────────────
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token;
}

export function getCsrfToken() {
  // Try memory first, then fall back to cookie (works in same-origin dev)
  if (csrfToken) return csrfToken;
  const match = document.cookie.match(/(^| )csrf-token=([^;]+)/);
  return match ? match[2] : null;
}

// ─── Axios Instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach CSRF token on mutating requests ──────────────
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

// ── Response Interceptor: Capture CSRF token + auto-refresh on 401 ───────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve();
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Capture CSRF token from any response that includes it
    if (response.data?.csrfToken) {
      setCsrfToken(response.data.csrfToken);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    const url = originalRequest?.url || '';

    // If 401 and not already retrying
    if (error.response?.status === 401 && !originalRequest._retry) {
      // Don't retry auth endpoints — just reject cleanly
      const skipPaths = ['/auth/refresh', '/auth/login', '/auth/me', '/auth/register'];
      if (skipPaths.some((p) => url.includes(p))) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(() => api(originalRequest));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await api.post('/auth/refresh');
        // Capture new CSRF token from refresh response
        if (refreshRes.data?.csrfToken) {
          setCsrfToken(refreshRes.data.csrfToken);
        }
        processQueue(null);
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError);
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
