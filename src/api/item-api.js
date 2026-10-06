import http from "@/api/axios";

export const getItems = async (
  page = 1,
  limit = 10,
  search = ""
) => {
  const res = await http.get("/api/items/get", {
    params: {
      page,
      limit,
      search,
    },
  });

  return {
    items: res.data?.items || [],
    pagination: res.data?.pagination || {},
  };
};

export const getItemsByProduct = async (productId) => {
  const res = await http.get(`/api/items/getByProduct/${productId}`);
  return res.data?.items || res.data?.data || [];
};

export const getItemById = async (id) => {
  const res = await http.get(`/api/items/getById/${id}`);
  return res.data?.item ?? res.data?.data ?? null;
};

const buildItemFormData = (data) => {
  const formData = new FormData();

  formData.append("name", data.name || "");
  if (data.productId) {
    formData.append("productId", String(Number(data.productId)));
  }
  if (data.designId) {
    formData.append("designId", String(Number(data.designId)));
  }
  if (data.purityId !== undefined && data.purityId !== null && data.purityId !== "" && data.purityId !== "NONE") {
    formData.append("purityId", String(Number(data.purityId)));
  } else if (data.purityId === "" || data.purityId === null || data.purityId === "NONE") {
    formData.append("purityId", "");
  }
  formData.append("description", data.description || "");

  // Item code on create only; existing items change it through the /barcode endpoints.
  if (data.generateBarcode) {
    formData.append("generateBarcode", "true");
  } else if (data.barcode) {
    formData.append("barcode", data.barcode);
  }

  if (data.image) {
    formData.append("image", data.image);
  }

  return formData;
};

export const addItem = async (data) => {
  const res = await http.post("/api/items/create", buildItemFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateItem = async (id, data) => {
  const res = await http.put(`/api/items/update/${id}`, buildItemFormData(data), {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteItem = async (id) => {
  const res = await http.delete(`/api/items/delete/${id}`);
  return res.data;
};

// Lean, unpaginated list of ALL items for dropdowns/pickers (CONTRACT §2).
// The paginated getItems() above is only for the Item master grid.
export const getItemOptions = async (search = "") => {
  const res = await http.get("/api/items/options", {
    params: search ? { search } : undefined,
  });
  const list = res.data?.data ?? res.data?.items ?? [];
  return Array.isArray(list) ? list : [];
};
