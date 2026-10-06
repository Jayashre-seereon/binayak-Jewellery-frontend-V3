import { create } from "zustand";

// NOTE (SEC-15 follow-up): tokens are still kept in localStorage. Moving the refresh
// token to an HttpOnly cookie needs a backend change; until then everything is wiped
// on logout and whenever a refresh fails.
const AUTH_KEYS = [
  "user",
  "token",
  "refreshToken",
  "role",
  "selectedStore",
  "selectedStoreId",
  // legacy keys from the removed store-login flow
  "storeUser",
  "storeToken",
  "storeRefreshToken",
];

const readJson = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key)) || null;
  } catch {
    return null;
  }
};

const read = (key) => {
  try {
    return localStorage.getItem(key) || null;
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // storage unavailable (private mode) — the in-memory state still works
  }
};

export const normalizeStore = (store) => {
  if (!store) return null;
  const id = store.id ?? store.storeId ?? store.store_id ?? store._id;
  if (!id) return null;
  return { ...store, id };
};

export const useAuthStore = create((set) => ({
  user: readJson("user"),
  token: read("token"),
  refreshToken: read("refreshToken"),
  role: read("role"),
  selectedStore: readJson("selectedStore"),

  setSession: ({ user, token, refreshToken, role }) => {
    if (user) write("user", JSON.stringify(user));
    if (token) write("token", token);
    if (refreshToken) write("refreshToken", refreshToken);
    if (role) write("role", role);

    set((state) => ({
      user: user ?? state.user,
      token: token ?? state.token,
      refreshToken: refreshToken ?? state.refreshToken,
      role: role ?? state.role,
    }));
  },

  /** Called after a token refresh: rotate both tokens, keep the user. */
  setTokens: ({ token, refreshToken }) => {
    if (token) write("token", token);
    if (refreshToken) write("refreshToken", refreshToken);
    set((state) => ({
      token: token ?? state.token,
      refreshToken: refreshToken ?? state.refreshToken,
    }));
  },

  updateUser: (patch) =>
    set((state) => {
      const user = state.user ? { ...state.user, ...patch } : patch;
      write("user", JSON.stringify(user));
      return { user };
    }),

  setSelectedStore: (store) => {
    const normalizedStore = normalizeStore(store);

    if (normalizedStore) {
      write("selectedStore", JSON.stringify(normalizedStore));
      write("selectedStoreId", String(normalizedStore.id));
    } else {
      write("selectedStore", null);
      write("selectedStoreId", null);
    }
    set({ selectedStore: normalizedStore });
  },

  clearSelectedStore: () => {
    write("selectedStore", null);
    write("selectedStoreId", null);
    set({ selectedStore: null });
  },

  logout: () => {
    AUTH_KEYS.forEach((key) => write(key, null));
    try {
      // drop any other per-session leftovers (drafts, remembered lookups)
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // ignore
    }
    set({
      user: null,
      token: null,
      refreshToken: null,
      role: null,
      selectedStore: null,
    });
  },
}));

/** Store the current session acts on (STORE login → own store, ADMIN → picked store). */
export const getActiveStoreId = () => {
  const { user, role, selectedStore } = useAuthStore.getState();
  if (role === "STORE" && user?.storeId) return Number(user.storeId);
  const id = selectedStore?.id ?? selectedStore?.storeId ?? read("selectedStoreId");
  return id ? Number(id) : null;
};
