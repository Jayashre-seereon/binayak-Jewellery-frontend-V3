import http from "./axios";

export const getPurities = async () => {
  const res = await http.get("/api/purities/get");
  return res.data?.data ?? [];
};

export const getPurityById = async (id) => {
  const res = await http.get(`/api/purities/getById/${id}`);
  return res.data?.data ?? null;
};

export const addPurity = async (data) => {
  const res = await http.post("/api/purities/create", data);
  return res.data;
};

export const updatePurity = async (id, data) => {
  const res = await http.put(`/api/purities/update/${id}`, data);
  return res.data;
};

export const deletePurity = async (id) => {
  const res = await http.delete(`/api/purities/delete/${id}`);
  return res.data;
};

// GET BY METAL
export const getPuritiesByMetal = async (metalId) => {
  const res = await http.get(`/api/purities/getByMetal/${metalId}`);
  return res.data;
};