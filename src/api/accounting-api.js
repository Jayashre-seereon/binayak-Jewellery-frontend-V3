import http from "./axios";

export const getAccountingSummary = async () => {
  const res = await http.get("/api/accounting/summary");
  return res.data?.data || {};
};

export const getNextVoucherNumber = async (type = "RECEIPT") => {
  const res = await http.get("/api/accounting/next-number", { params: { type } });
  return res.data?.nextNumber || "";
};
export const getAccounts = async () => {
  const res = await http.get("/api/accounting/accounts");
  return res.data?.data || [];
};

export const getPendingSales = async ({ customerId, phone } = {}) => {
  const res = await http.get("/api/accounting/pending-sales", {
    params: { customerId, phone },
  });
  return res.data?.data || [];
};

export const getPendingPurchases = async ({ partyId, phone } = {}) => {
  const res = await http.get("/api/accounting/pending-purchases", {
    params: { partyId, phone },
  });
  return res.data || { data: [], supplier: null, totalOutstandingDue: 0 };
};

export const getPendingSuppliers = async () => {
  const res = await http.get("/api/accounting/pending-suppliers");
  return res.data?.data || [];
};

export const getReceiptVouchers = async (params = {}) => {
  const res = await http.get("/api/accounting/receipts", { params });
  return res.data || { vouchers: [], pagination: {} };
};

export const createReceiptVoucher = async (data) => {
  const res = await http.post("/api/accounting/receipts", data);
  return res.data;
};

export const getPaymentVouchers = async (params = {}) => {
  const res = await http.get("/api/accounting/payments", { params });
  return res.data || { vouchers: [], pagination: {} };
};

export const createPaymentVoucher = async (data) => {
  const res = await http.post("/api/accounting/payments", data);
  return res.data;
};

export const getJournalEntries = async (params = {}) => {
  const res = await http.get("/api/accounting/journals", { params });
  return res.data || { vouchers: [], pagination: {} };
};

export const createJournalEntry = async (data) => {
  const res = await http.post("/api/accounting/journals", data);
  return res.data;
};

export const getVoucherById = async (id) => {
  const res = await http.get(`/api/accounting/vouchers/${id}`);
  return res.data?.data || null;
};

export const getVoucherPdf = async (id) => {
  const res = await http.get(`/api/accounting/vouchers/${id}/downloadPdf`, {
    responseType: "blob",
  });
  return res.data;
};

export const cancelVoucher = async (id, reason) => {
  const res = await http.post(`/api/accounting/vouchers/${id}/cancel`, { reason });
  return res.data;
};
