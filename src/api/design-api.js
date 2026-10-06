import http from "./axios";

export const getDesigns = async () => {
  const res = await http.get("/api/designs/get");
  return res.data?.designs || [];   
};

export const getDesignById = async (id) => {
  const res = await http.get(`/api/designs/getById/${id}`);
  return res.data?.design ?? res.data?.data ?? null;
};

export const addDesign = async (data) => {
  const formData = new FormData();
  formData.append("name", data.name || "");
  formData.append("description", data.description || "");

  if (data.image) {
    formData.append("image", data.image);
  }

  const res = await http.post("/api/designs/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const updateDesign = async (id, data) => {
  const formData = new FormData();
  formData.append("name", data.name || "");
  formData.append("description", data.description || "");

  if (data.image) {
    formData.append("image", data.image);
  }

  const res = await http.put(`/api/designs/update/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return res.data;
};

export const deleteDesign = async (id) => {
  const res = await http.delete(`/api/designs/delete/${id}`);
  return res.data;
};