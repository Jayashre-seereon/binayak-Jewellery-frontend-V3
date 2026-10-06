import http from "./axios";
// GET ALL
export const getMetals = async () => {
  const res = await http.get("/api/metals/get");
  return res.data?.metals ?? [];
};

// GET BY ID
export const getMetalById = async (id) => {
  const res = await http.get(`/api/metals/getbyId/${id}`);
  return res.data?.metal ?? null;
};

// CREATE
export const addMetal = async (data) => {
  const res = await http.post("/api/metals/create", data);
  return res.data;
};

// UPDATE 
export const updateMetal = async (id, data) => {
  const res = await http.put(`/api/metals/update/${id}`, data);
  return res.data;
};

// DELETE
export const deleteMetal = async (id) => {
  const res = await http.delete(`/api/metals/delete/${id}`);
  return res.data;
};