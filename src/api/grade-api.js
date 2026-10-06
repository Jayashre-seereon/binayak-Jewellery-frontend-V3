import http from "./axios";

export const getGrades = async () => {
  const res = await http.get("/api/grades/get");
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data ?? res.data?.grades ?? [];
};

export const getGradesByPurity = async (purityId) => {
  const res = await http.get(`/api/grades/getByPurity/${purityId}`);
  if (Array.isArray(res.data)) return res.data;
  return res.data?.data ?? res.data?.grades ?? [];
};

export const getGradeById = async (id) => {
  const res = await http.get(`/api/grades/getById/${id}`);
  if (res.data?.data && !Array.isArray(res.data.data)) return res.data.data;
  if (res.data?.grade) return res.data.grade;
  if (res.data && !Array.isArray(res.data)) return res.data;
  return null;
};

export const addGrade = async (data) => {
  const res = await http.post("/api/grades/create", data);
  return res.data;
};

export const updateGrade = async (id, data) => {
  const res = await http.put(`/api/grades/update/${id}`, data);
  return res.data;
};

export const deleteGrade = async (id) => {
  const res = await http.delete(`/api/grades/delete/${id}`);
  return res.data;
};
