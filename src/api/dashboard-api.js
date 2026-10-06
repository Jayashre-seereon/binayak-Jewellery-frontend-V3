import http from "./axios";

// The axios interceptor adds ?storeId= for the active store; there is no fallback store.
export const getDashboardSummary = async ({ period = "this_month" } = {}) => {
  const res = await http.get("/api/dashboard/summary", { params: { period } });
  return res.data?.data || null;
};
