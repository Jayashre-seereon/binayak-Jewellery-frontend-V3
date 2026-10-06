import http from "@/api/axios";

// ---------------------------------------------------------------- Sales / Purchase report (existing endpoints)
export const getSalesReport = async (params = {}) => {
  const res = await http.get("/api/sales/report", { params });
  return res.data;
};

export const getPurchaseReport = async (params = {}) => {
  const res = await http.get("/api/purchases/report", { params });
  return res.data;
};

/** File exports return the whole axios response so callers can read Content-Disposition. */
export const exportSalesReportExcelApi = (params = {}) =>
  http.get("/api/sales/report/export-excel", { params, responseType: "blob" });

export const exportPurchaseReportExcelApi = (params = {}) =>
  http.get("/api/purchases/report/export-excel", { params, responseType: "blob" });

export const exportSalesReportPdfApi = (params = {}) =>
  http.get("/api/sales/report/export-pdf", { params, responseType: "blob" });

export const exportPurchaseReportPdfApi = (params = {}) =>
  http.get("/api/purchases/report/export-pdf", { params, responseType: "blob" });

// ---------------------------------------------------------------- report engine (/api/reports)
export const getReportCatalogue = async () => {
  const res = await http.get("/api/reports");
  return res.data?.data || [];
};

export const getReportData = async (key, params = {}) => {
  const res = await http.get(`/api/reports/${encodeURIComponent(key)}`, {
    params: { ...params, format: "json" },
  });
  return res.data?.data;
};

/** format: "pdf" | "xlsx" — resolves to the axios response (blob + headers). */
export const downloadReportApi = (key, params = {}, format = "pdf") =>
  http.get(`/api/reports/${encodeURIComponent(key)}`, {
    params: { ...params, format },
    responseType: "blob",
  });
