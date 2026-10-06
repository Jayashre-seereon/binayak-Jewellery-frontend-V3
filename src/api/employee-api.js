import http from "@/api/axios";

export const getEmployees = async () => {
  const res = await http.get("/api/employees/get");
  return res.data?.employees || [];
};

export const getEmployeeById = async (id) => {
  const res = await http.get(`/api/employees/getById/${id}`);
  return res.data?.employee ?? res.data?.data ?? null;
};

export const addEmployee = async (data) => {
  const res = await http.post("/api/employees/create", data);
  return res.data;
};

export const updateEmployee = async (id, data) => {
  const res = await http.put(`/api/employees/update/${id}`, data);
  return res.data;
};

export const deleteEmployee = async (id) => {
  const res = await http.delete(`/api/employees/delete/${id}`);
  return res.data;
};