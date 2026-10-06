import http from "@/api/axios";

export const getStock = async (options) => {
  const res = await http.get("/api/inventories/get", options ? { params: options } : undefined);
  if (options) return {
    inventories: res.data?.inventories ?? [],
    pagination: res.data?.pagination ?? {},
  };
  return res.data?.inventories ?? [];
};

export const getStockById = async (id) => {
  const res = await http.get(`/api/inventories/getById/${id}`);
  return res.data?.inventory ?? res.data?.data ?? null;
};

export const createStock = async (purchaseItemId) => {
  const res = await http.post("/api/inventories/create", {
    purchaseItemId,
  });
  return res.data?.inventory ?? null;
};

export const updateStock = async (id, data) => {
  const res = await http.put(`/api/inventories/update/${id}`, data);
  return res.data?.inventory ?? null;
};

export const updateStockStatus = async (id, status) => {
  const res = await http.put(`/api/inventories/status/${id}`, { status });
  return res.data?.inventory ?? null;
};

export const deleteStock = async (id) => {
  const res = await http.delete(`/api/inventories/delete/${id}`);
  return res.data;
};

export const getStockLabelPdf = async (id) => {
  const res = await http.get(`/api/inventories/label/${id}`, {
    responseType: "blob",
  });

  return res.data;
};

export const getStockLabelsBulkPdf = async (ids) => {
  const res = await http.post(
    "/api/inventories/labels/bulk",
    { ids },
    { responseType: "blob" }
  );
  return res.data;
};

// Manual status changes allowed by the server (CONTRACT §4). SOLD / PENDING are system-only.
export const STATUS_TRANSITIONS = {
  AVAILABLE: ["RESERVED", "DAMAGED", "MELTED"],
  RESERVED: ["AVAILABLE"],
  DAMAGED: ["AVAILABLE", "MELTED"],
  MELTED: ["REFINED"],
};

// Only these fields can be changed on an existing piece (CONTRACT §4).
export const EDITABLE_INVENTORY_FIELDS = ["huidNo", "hsnCode", "narration", "itemPhoto", "assayCertNo", "barSerialNo", "extraDetails"];

/** Stock summary report (CONTRACT §6): json → {columns, rows, totals, summary, meta}. */
export const getStockSummaryReport = async (params = {}) => {
  const res = await http.get("/api/reports/stock-summary", {
    params: { ...params, format: "json" },
  });
  return res.data?.data ?? null;
};

/** Same report as a file (format = "pdf" | "xlsx"); resolves to { blob, filename }. */
export const downloadStockSummaryReport = async (format, params = {}) => {
  const res = await http.get("/api/reports/stock-summary", {
    params: { ...params, format },
    responseType: "blob",
  });
  const disposition = res.headers?.["content-disposition"] || "";
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
  const filename = match ? decodeURIComponent(match[1]) : `stock-summary.${format}`;
  return { blob: res.data, filename };
};

/** Report catalog entry (filters + options) for a report key, or null. */
export const getReportDefinition = async (key) => {
  const res = await http.get("/api/reports");
  const list = res.data?.data ?? [];
  return (Array.isArray(list) ? list : []).find((r) => r.key === key) || null;
};
