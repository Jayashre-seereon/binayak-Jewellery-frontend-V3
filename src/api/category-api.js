import http from "./axios";

// GET all categories
export const getCategory = async () => {
  const res = await http.get("/api/categories/get");
  return res.data?.categories ?? [];
};

// GET by ID
export const getCategoryById = async (id) => {
  const res = await http.get(`/api/categories/getbyId/${id}`);
  return res.data?.category ?? null;
};

// CREATE
export const addCategory = async (data) => {
  const res = await http.post("/api/categories/create", data);
  return res.data;
};

// UPDATE
export const updateCategory = async (id, data) => {
  const res = await http.put(`/api/categories/update/${id}`, data);
  return res.data;
};

// DELETE
export const deleteCategory = async (id) => {
  const res = await http.delete(`/api/categories/delete/${id}`);
  return res.data;
};