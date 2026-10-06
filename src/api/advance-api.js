import http from "./axios";

export const getAdvances = async () => {
  const res = await http.get("/api/advance-receives/get");
  return res.data?.data ?? [];
};

export const getAdvanceById = async (id) => {
  const res = await http.get(
    `/api/advance-receives/getById/${id}`
  );

  return res.data?.data ?? null;
};

export const getAdvancesByContact = async (contactNumber) => {
  const res = await http.get("/api/advance-receives/by-contact", {
    params: { contactNumber },
  });

  return res.data?.data ?? [];
};

export const addAdvance = async (data) => {
  const payload = {
    customerName: data.customerName,
    contactNumber: data.contactNumber,
    address: data.address,
    amount: Number(data.amount),
    paymentMode: data.paymentMode,
    specification: data.specification,
    date: data.date || data.receiveDate || null,
  };

  const res = await http.post(
    "/api/advance-receives/create",
    payload
  );

  return res.data;
};

export const updateAdvance = async (id, data) => {
  const payload = {
    customerName: data.customerName,
    contactNumber: data.contactNumber,
    address: data.address,
    amount: Number(data.amount),
    paymentMode: data.paymentMode,
    specification: data.specification,
    date: data.date || data.receiveDate || null,
  };

  const res = await http.put(
    `/api/advance-receives/update/${id}`,
    payload
  );

  return res.data;
};

export const deleteAdvance = async (id) => {
  const res = await http.delete(
    `/api/advance-receives/delete/${id}`
  );

  return res.data;
};
