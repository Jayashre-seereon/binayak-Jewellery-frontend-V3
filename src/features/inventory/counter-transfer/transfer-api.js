import http from "@/api/axios";
import { getStoreOptions } from "@/api/store-api";
import { getActiveStoreId } from "@/store/authStore";

// The axios interceptor adds ?storeId= for the active store; the backend forces it for STORE logins.

export const getTransfers = async () => {
  const res = await http.get("/api/inventory-transfer/get");
  return res.data?.transfers ?? [];
};

export const getTransferById = async (id) => {
  const res = await http.get(`/api/inventory-transfer/getById/${id}`);
  return res.data?.transfer ?? null;
};

export const createTransfer = async (payload) => {
  const res = await http.post("/api/inventory-transfer/create", {
    ...payload,
    fromStoreId: getActiveStoreId() ?? undefined,
  });
  return res.data?.transfer ?? null;
};

export const updateTransfer = async (id, payload) => {
  const res = await http.put(`/api/inventory-transfer/update/${id}`, payload);
  return res.data?.transfer ?? null;
};

export const cancelTransfer = async (id, payload = {}) => {
  const res = await http.put(`/api/inventory-transfer/cancel/${id}`, payload);
  return res.data?.transfer ?? null;
};

export const receiveTransfer = async (id, payload = {}) => {
  const res = await http.put(`/api/inventory-transfer/receive/${id}`, payload);
  return res.data?.transfer ?? null;
};

/** AVAILABLE pieces of the active store, server-searched (barcode / tag / HUID / item / product). */
export const searchAvailableInventory = async ({ search = "", page = 1, limit = 50 } = {}) => {
  const res = await http.get("/api/inventories/get", {
    params: { status: "AVAILABLE", page, limit, search: search || undefined },
  });
  return {
    inventories: res.data?.inventories ?? [],
    pagination: res.data?.pagination ?? {},
  };
};

/** Destination stores: every store except the one the user is working in. */
export const getDestinationStores = async () => {
  const own = getActiveStoreId();
  const stores = await getStoreOptions();
  return stores.filter((store) => String(store.id) !== String(own));
};
