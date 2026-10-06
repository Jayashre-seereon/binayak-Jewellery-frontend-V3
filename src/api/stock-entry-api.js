import http from "@/api/axios";

/** POST /api/stock/entries → { purchase, pieces } (CONTRACT v3.1 "Stock Entry"). */
export const createStockEntry = async (payload) => {
  const res = await http.post("/api/stock/entries", payload);
  return res.data?.data ?? null;
};

/** GET /api/stock/entries → { entries, pagination } */
export const getStockEntries = async ({ page = 1, limit = 20, search = "" } = {}) => {
  const res = await http.get("/api/stock/entries", {
    params: { page, limit, search: search || undefined },
  });
  const entries = res.data?.data;
  return {
    entries: Array.isArray(entries) ? entries : [],
    pagination: res.data?.pagination ?? { page, limit, total: 0, totalPages: 1 },
  };
};

export const deleteStockEntry = async (id) => {
  const res = await http.delete(`/api/stock/entries/${id}`);
  return res.data;
};

/** GET /api/stock/barcode-check?code= → { available, usedBy } */
export const checkStockBarcode = async (code) => {
  const res = await http.get("/api/stock/barcode-check", { params: { code } });
  return res.data?.data ?? { available: false, usedBy: null };
};
