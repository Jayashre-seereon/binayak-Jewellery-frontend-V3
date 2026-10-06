import http from "./axios";

// GET ALL
export const getParties = async (storeId) => {
  const res = await http.get("/api/partymasters/get", { params: { storeId } });
  return res.data;
};



// CREATE
export const addParty = async (data) => {
  const res = await http.post("/api/partymasters/create", data);
  return res.data;
};

// GET BY ID
export const getPartyById = async (id, storeId) => {
  const res = await http.get(`/api/partymasters/getbyId/${id}`, { params: { storeId } });
  return res.data;
};

// UPDATE
export const updateParty = async (id, data, storeId) => {
  const res = await http.put(`/api/partymasters/update/${id}`, data, { params: { storeId } });
  return res.data;
};

// DELETE
export const deleteParty = async (id, storeId) => {
  const res = await http.delete(`/api/partymasters/delete/${id}`, { params: { storeId } });
  return res.data;
};