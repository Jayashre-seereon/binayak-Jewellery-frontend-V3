import axios from "axios";
import { useAuthStore, getActiveStoreId } from "../store/authStore";

const baseURL = import.meta.env.VITE_API_BASE_URL;

const http = axios.create({ baseURL });

const PUBLIC_AUTH_PATHS = [
  "/api/users/login",
  "/api/users/refresh-token",
  "/api/users/forgot",
  "/api/users/reset",
];

const isPublicAuthUrl = (url = "") =>
  PUBLIC_AUTH_PATHS.some((path) => url.includes(path));

// The bearer token is only ever sent to our own API (relative URLs or the API base URL).
const isOwnApiUrl = (url = "") => !/^https?:\/\//i.test(url) || (baseURL && url.startsWith(String(baseURL).replace(/\/$/, "") + "/"));

http.interceptors.request.use((config) => {
  if (isPublicAuthUrl(config.url) || !isOwnApiUrl(config.url)) return config;

  const { token } = useAuthStore.getState();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // The backend enforces the tenant from the token for STORE logins; ADMIN picks a store.
  const storeId = getActiveStoreId();
  if (storeId) {
    config.params = { ...config.params, storeId };
  }

  return config;
});

// One refresh at a time: concurrent 401s wait for the same promise, so a rotated
// refresh token is only ever spent once.
let refreshPromise = null;

const endSession = () => {
  useAuthStore.getState().logout();
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
};

const refreshSession = () => {
  if (!refreshPromise) {
    const { refreshToken } = useAuthStore.getState();
    if (!refreshToken) return Promise.reject(new Error("No refresh token"));

    refreshPromise = axios
      .post(`${baseURL}/api/users/refresh-token`, { refreshToken })
      .then((response) => {
        const body = response.data?.data || response.data || {};
        const token = body.accessToken || body.token;
        if (!token) throw new Error("Refresh failed");
        useAuthStore.getState().setTokens({
          token,
          refreshToken: body.refreshToken,
        });
        if (body.user) useAuthStore.getState().updateUser(body.user);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const status = error.response?.status;

    // The server refuses business calls until a forced password change is done.
    if (status === 403 && error.response?.data?.code === "PASSWORD_CHANGE_REQUIRED") {
      useAuthStore.getState().updateUser({ mustChangePassword: true });
      return Promise.reject(error);
    }

    if (
      status !== 401 ||
      !originalRequest ||
      originalRequest._retry ||
      isPublicAuthUrl(originalRequest.url)
    ) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      const token = await refreshSession();
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return http(originalRequest);
    } catch {
      endSession();
      return Promise.reject(error);
    }
  }
);

export default http;
