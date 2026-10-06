import http from "./axios";

export const getBrands = async () => {
  const res = await http.get("/api/brands/get");
  return res.data?.brands ?? [];
};

export const getBrandById = async (id) => {
  const res = await http.get(`/api/brands/getbyId/${id}`);
  return res.data?.brand ?? null;
};

export const addBrand = async (data) => {
  const res = await http.post("/api/brands/create", data);
  return res.data;
};

export const updateBrand = async (id, data) => {
  const res = await http.put(`/api/brands/update/${id}`, data);
  return res.data;
};

export const deleteBrand = async (id) => {
  const res = await http.delete(`/api/brands/delete/${id}`);
  return res.data;
};