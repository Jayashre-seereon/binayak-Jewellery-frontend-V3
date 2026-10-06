let vouchers = [];

export const getVouchers = () => Promise.resolve(vouchers);

export const addVoucher = (data) => {
  data.id = vouchers.length + 1;
  vouchers.push(data);
  return Promise.resolve(data);
};

export const updateVoucher = (data) => {
  vouchers = vouchers.map((v) =>
    v.id === data.id ? data : v
  );
  return Promise.resolve(data);
};

export const deleteVoucher = (id) => {
  vouchers = vouchers.filter((v) => v.id !== id);
  return Promise.resolve();
};