import http from "@/api/axios";

export const getSales = async (options) => {
  const res = await http.get("/api/sales/get", options ? { params: options } : undefined);
  if (options) return {
    sales: res.data?.sales ?? [],
    pagination: res.data?.pagination ?? {},
  };
  return res.data?.sales ?? [];
};

export const getSaleById = async (id) => {
  const res = await http.get(`/api/sales/getById/${id}`);
  return res.data?.sale ?? null;
};

export const createSale = async (payload) => {
  const res = await http.post("/api/sales/create", payload);
  return res.data ?? null;
};

export const getSalePdf = async (id) => {
  try {
    const res = await http.get(`/api/sales/downloadPdf/${id}`, { responseType: "blob" });
    if (res.data?.type && res.data.type !== "application/pdf") {
      const errorText = await res.data.text();
      throw new Error(JSON.parse(errorText)?.message || "Unable to download sale invoice PDF.");
    }
    return res.data;
  } catch (error) {
    const responseBlob = error?.response?.data;
    if (responseBlob instanceof Blob) {
      try {
        const errorText = await responseBlob.text();
        const message = JSON.parse(errorText)?.message;
        if (message) throw new Error(message);
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message !== error.message) throw parseError;
      }
    }
    throw error;
  }
};

export const cancelSale = async (id, reason) => {
  const res = await http.post(`/api/sales/${id}/cancel`, { reason });
  return res.data?.data ?? res.data?.sale ?? null;
};
