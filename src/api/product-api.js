import http from "./axios";

export const getProducts = async () => {
  const res = await http.get("/api/products/get");
  return res.data?.products || [];
};

export const getProductsByMetal = async (metalId) => {
  const res = await http.get(`/api/products/getByMetal/${metalId}`);
  return res.data?.products || res.data?.data || [];
};

export const getProductById = async (id) => {
  const res = await http.get(`/api/products/getById/${id}`);
  return res.data?.product ?? res.data?.data ?? null;
};

export const addProduct = async (data) => {
  const formData = new FormData();
  formData.append("name", data.name || "");
  formData.append("description", data.description || "");

  if (data.categoryId !== undefined && data.categoryId !== null && data.categoryId !== "") {
    formData.append("categoryId", String(Number(data.categoryId)));
  }

  if (data.metalId !== undefined && data.metalId !== null && data.metalId !== "") {
    formData.append("metalId", String(Number(data.metalId)));
  }

  if (data.purityId !== undefined && data.purityId !== null && data.purityId !== "" && data.purityId !== "NONE") {
    formData.append("purityId", String(Number(data.purityId)));
  }

  if (data.gradeId !== undefined && data.gradeId !== null && data.gradeId !== "" && data.gradeId !== "NONE") {
    formData.append("gradeId", String(Number(data.gradeId)));
  }

  if (data.image) {
    formData.append("image", data.image);
  }

  const res = await http.post("/api/products/create", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const updateProduct = async (id, data) => {
  const formData = new FormData();
  formData.append("name", data.name || "");
  formData.append("description", data.description || "");

  if (data.categoryId !== undefined && data.categoryId !== null && data.categoryId !== "") {
    formData.append("categoryId", String(Number(data.categoryId)));
  }

  if (data.metalId !== undefined && data.metalId !== null && data.metalId !== "") {
    formData.append("metalId", String(Number(data.metalId)));
  }

  if (data.purityId !== undefined && data.purityId !== null && data.purityId !== "" && data.purityId !== "NONE") {
    formData.append("purityId", String(Number(data.purityId)));
  } else if (data.purityId === "" || data.purityId === null || data.purityId === "NONE") {
    formData.append("purityId", "");
  }

  if (data.gradeId !== undefined && data.gradeId !== null && data.gradeId !== "" && data.gradeId !== "NONE") {
    formData.append("gradeId", String(Number(data.gradeId)));
  } else if (data.gradeId === "" || data.gradeId === null || data.gradeId === "NONE") {
    formData.append("gradeId", "");
  }

  if (data.image) {
    formData.append("image", data.image);
  }

  const res = await http.put(`/api/products/update/${id}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
};

export const deleteProduct = async (id) => {
  const res = await http.delete(`/api/products/delete/${id}`);
  return res.data;
};
