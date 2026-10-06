import http from "./axios";

// GET ALL
export const getOpenings = async (storeId) => {
  const res = await http.get("/api/partyopeningbalances/get", { params: { storeId } });
  return res.data;
};

// GET BY ID
export const getOpeningById = async (id, storeId) => {
  const res = await http.get(`/api/partyopeningbalances/getbyId/${id}`, { params: { storeId } });
  return res.data;
};

// CREATE
export const addOpening = async (data) => {
  const res = await http.post("/api/partyopeningbalances/create", data);
  return res.data;
};

// UPDATE
export const updateOpening = async (id, data, storeId) => {
  const res = await http.put(`/api/partyopeningbalances/update/${id}`, data, { params: { storeId } });
  return res.data;
};

// DELETE
export const deleteOpening = async (id, storeId) => {
  const res = await http.delete(`/api/partyopeningbalances/delete/${id}`, { params: { storeId } });
  return res.data;
};