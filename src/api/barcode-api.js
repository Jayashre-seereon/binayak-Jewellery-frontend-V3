import http from "./axios";
import { normalizeBarcodeConfig } from "@/lib/barcode/config";

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

const currentStoreKey = () => {
  try {
    return localStorage.getItem("selectedStoreId") || "default";
  } catch {
    return "default";
  }
};

/**
 * axios with responseType "blob" hands JSON error bodies back as a Blob; turn them into a readable
 * Error so toasts show the server's message ("No stock found for barcode X").
 */
export const unwrapBlobError = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const message = JSON.parse(text)?.message;
      if (message) {
        const wrapped = new Error(message);
        wrapped.response = { ...error.response, data: { message } };
        return wrapped;
      }
    } catch {
      /* not JSON */
    }
  }
  return error;
};

const getBlob = async (url, config = {}) => {
  try {
    const res = await http.get(url, { ...config, responseType: "blob" });
    return res.data;
  } catch (error) {
    throw await unwrapBlobError(error);
  }
};

/* ------------------------------------------------------------------ */
/* config                                                              */
/* ------------------------------------------------------------------ */

const configCache = new Map(); // storeId -> Promise<config>
const configListeners = new Set();

export const getBarcodeConfig = ({ force = false } = {}) => {
  const key = currentStoreKey();
  if (!force && configCache.has(key)) return configCache.get(key);
  const promise = http
    .get("/api/barcode/config")
    .then((res) => normalizeBarcodeConfig(res.data?.data ?? res.data?.config))
    .catch((error) => {
      configCache.delete(key);
      throw error;
    });
  configCache.set(key, promise);
  return promise;
};

export const saveBarcodeConfig = async (partial) => {
  const res = await http.put("/api/barcode/config", partial);
  const saved = normalizeBarcodeConfig(res.data?.data ?? partial);
  configCache.set(currentStoreKey(), Promise.resolve(saved));
  configListeners.forEach((fn) => fn(saved));
  return saved;
};

/** Lets mounted scanners pick up a config saved on the Settings page without a reload. */
export const subscribeBarcodeConfig = (fn) => {
  configListeners.add(fn);
  return () => configListeners.delete(fn);
};

/* ------------------------------------------------------------------ */
/* scan / lookup                                                       */
/* ------------------------------------------------------------------ */

/** GET /api/barcode/scan/:code → { matchType: "INVENTORY" | "ITEM", code, cleanedCode, inventory, item?, notice?, billingLine } */
export const scanBarcode = async (code) => {
  const res = await http.get(`/api/barcode/scan/${encodeURIComponent(code)}`);
  return res.data?.data ?? null;
};

/** Item status lookup — any status (unlike scan, which only resolves sellable pieces). */
export const getInventoryByCode = async (code) => {
  const res = await http.get(`/api/inventories/getByBarcode/${encodeURIComponent(code)}`);
  return res.data?.inventory ?? res.data?.data ?? null;
};

export const searchInventories = async ({ status = "AVAILABLE", search = "", page = 1, limit = 50, ...rest } = {}) => {
  const res = await http.get("/api/inventories/get", {
    params: { status: status || undefined, search: search || undefined, page, limit, ...rest },
  });
  return {
    inventories: res.data?.inventories ?? [],
    pagination: res.data?.pagination ?? { page, limit, total: 0, totalPages: 1 },
  };
};

/* ------------------------------------------------------------------ */
/* images & labels                                                     */
/* ------------------------------------------------------------------ */

export const getBarcodeImageBlob = (code, { symbology, scale = 3, height = 12, includeText = 1 } = {}) =>
  getBlob(`/api/barcode/image/${encodeURIComponent(code)}`, {
    params: { symbology: symbology || undefined, scale, height, includeText },
  });

export const getInventoryLabelPdf = (id) => getBlob(`/api/inventories/label/${id}`);

export const getInventoryLabelsBulkPdf = async (ids) => {
  try {
    const res = await http.post("/api/inventories/labels/bulk", { ids }, { responseType: "blob" });
    return res.data;
  } catch (error) {
    throw await unwrapBlobError(error);
  }
};

/* ------------------------------------------------------------------ */
/* item codes (fixed-price / MRP goods)                                */
/* ------------------------------------------------------------------ */

/** POST /api/items/:id/barcode/generate → { barcode, item, generated } */
export const generateItemBarcode = async (itemId) => {
  const res = await http.post(`/api/items/${itemId}/barcode/generate`);
  return res.data?.data ?? null;
};

/** PUT /api/items/:id/barcode → { barcode, item } (409 when the code belongs to another item or a piece) */
export const assignItemBarcode = async (itemId, barcode) => {
  const res = await http.put(`/api/items/${itemId}/barcode`, { barcode });
  return res.data?.data ?? null;
};

/** DELETE /api/items/:id/barcode → item */
export const removeItemBarcode = async (itemId) => {
  const res = await http.delete(`/api/items/${itemId}/barcode`);
  return res.data?.data ?? null;
};

export const getItemLabelPdf = (itemId, copies = 1) =>
  getBlob(`/api/items/${itemId}/barcode/label`, { params: { copies } });

/* ------------------------------------------------------------------ */
/* piece re-label                                                      */
/* ------------------------------------------------------------------ */

/** PUT /api/inventories/:id/barcode — new barcode for an AVAILABLE / RESERVED piece. */
export const changeInventoryBarcode = async (inventoryId, barcode) => {
  const res = await http.put(`/api/inventories/${inventoryId}/barcode`, { barcode });
  return res.data?.data ?? null;
};
