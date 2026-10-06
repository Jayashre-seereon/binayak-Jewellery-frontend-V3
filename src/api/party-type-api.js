import http from "@/api/axios";

// GET ALL
export const getPartyTypes = async (storeId) => {
  const res = await http.get("/api/partytypes/get", { params: { storeId } });
  return res.data?.partytypes ?? [];
};

// GET BY ID
export const getPartyTypeById = async (id) => {
  const res = await http.get(`/api/partytypes/getbyId/${id}`);
  return res.data?.partytype ?? null;
};

// CREATE
export const addPartyType = async (data) => {
  const res = await http.post("/api/partytypes/create", data);
  return res.data;
};

// UPDATE
export const updatePartyType = async (id, data) => {
  const res = await http.put(`/api/partytypes/update/${id}`, data);
  return res.data;
};

// DELETE
export const deletePartyType = async (id) => {
  const res = await http.delete(`/api/partytypes/delete/${id}`);
  return res.data;
};