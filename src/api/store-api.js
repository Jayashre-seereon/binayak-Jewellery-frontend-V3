import axios from "@/api/axios";

export const getStores = async () => {
  const res = await axios.get("/api/stores/get");
  return res;
};

export const createStore = async (payload) => {
  const res = await axios.post("/api/stores/create", payload);
  return res;
};

export const deleteStore = async (id) => {
  const res = await axios.delete(`/api/stores/delete/${id}`);
  return res;
};

export const getStoreById = async (id) => {
  const res = await axios.get(`/api/stores/getById/${id}`);
  return res;
};

export const updateStore = async (id, payload) => {
  const res = await axios.put(`/api/stores/update/${id}`, payload);
  return res;
};

// ADMIN: set a new password for a store login (the store must change it at next login).
export const resetStorePassword = async (id, newPassword) => {
  const res = await axios.put(`/api/stores/${id}/password`, { newPassword });
  return res;
};

// Any logged-in user: lightweight [{id, storeName, location}] for pickers.
export const getStoreOptions = async () => {
  const res = await axios.get("/api/stores/options");
  const body = res.data || {};
  const list = body.data || body.stores || [];
  return Array.isArray(list) ? list : [];
};

/**
 * State of the active store for GST previews. Uses the cached store object when it has a
 * state, then /api/stores/options; returns null when unknown (the server then defaults
 * to its own store master, normally ODISHA).
 */
export const resolveStoreState = async (storeId, cachedStore) => {
  if (cachedStore?.state) return cachedStore.state;
  if (!storeId) return null;
  try {
    const options = await getStoreOptions();
    const own = options.find((s) => String(s.id) === String(storeId));
    return own?.state || null;
  } catch {
    return null;
  }
};
