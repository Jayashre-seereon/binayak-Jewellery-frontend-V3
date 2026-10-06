import http from "@/api/axios";

export const getStones = async () => {
  const res = await http.get("/api/stones/get");
  return res.data?.stones || [];
};

export const getStonesByProductAndItem = async (productId, itemId) => {
  const res = await http.get(`/api/stones/getByProductItem/${productId}/${itemId}`);
  return res.data?.stones || res.data?.data || [];
};

export const getStoneById = async (id) => {
  const res = await http.get(`/api/stones/getById/${id}`);
  return res.data?.stone ?? res.data?.data ?? null;
};

export const addStone = async (data) => {
  const res = await http.post("/api/stones/create", {
    name: data.name || "",
    description: data.description || "",
    productId: Number(data.productId),
    itemId: Number(data.itemId),
  });
  return res.data;
};

export const updateStone = async (id, data) => {
  const res = await http.put(`/api/stones/update/${id}`, {
    name: data.name || "",
    description: data.description || "",
    productId: Number(data.productId),
    itemId: Number(data.itemId),
  });
  return res.data;
};

export const deleteStone = async (id) => {
  const res = await http.delete(`/api/stones/delete/${id}`);
  return res.data;
};
