import http from "./axios";

export const lookupCustomerByPhone = async (phone, storeId) => {
  const res = await http.get("/api/customers/lookup", {
    params: {
      phone,
      ...(storeId ? { storeId } : {}),
    },
  });
  return res.data;
};

export const getCustomerHistory = async (customerId, storeId) => {
  const res = await http.get(`/api/customers/${customerId}/history`, {
    params: storeId ? { storeId } : {},
  });
  return res.data;
};

export const getCustomers = async (storeId, search = "") => {
  const res = await http.get("/api/customers/get", {
    params: {
      ...(storeId ? { storeId } : {}),
      ...(search ? { search } : {}),
    },
  });
  return res.data?.customers || [];
};
