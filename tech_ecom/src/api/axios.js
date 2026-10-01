/**
 * Axios API Instance
 * Centralized HTTP client with interceptors for auth token refresh.
 * Automatically attaches CSRF token from cookie on state-changing requests.
 */
import axios from 'axios';

/**
 * Read a cookie value by name (needed to extract csrf-token for headers)
 */
function getCookie(name) {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
  return match ? match[2] : null;
}

const api = axios.create({
  baseURL: '/api',
  withCredentials: true, // Send cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
});

// ── Request Interceptor: Attach CSRF token on mutating requests ──────────────
api.interceptors.request.use((config) => {
  const mutatingMethods = ['post', 'put', 'patch', 'delete'];
  if (mutatingMethods.includes(config.method)) {
    const csrfToken = getCookie('csrf-token');
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
});

// ── Response Interceptor: Auto-refresh on 401 ────────────────────────────────
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
  (response) => response,
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
        await api.post('/auth/refresh');
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
