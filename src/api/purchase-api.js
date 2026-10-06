import http from "./axios";

export const getPurchases = async () => {
  const res = await http.get("/api/purchases/get");
  return res.data?.purchases ?? [];
};

export const getPurchaseById = async (id) => {
  const res = await http.get(`/api/purchases/getById/${id}`);
  return res.data?.purchase ?? null;
};

export const getPurchaseItemsByPurchaseId = async (purchaseId) => {
  const res = await http.get(`/api/purchases/itemsByPurchase/${purchaseId}`);
  return res.data?.purchaseItems ?? [];
};

export const getOldGoldPurchasesByPhone = async (phone) => {
  const res = await http.get("/api/purchases/old-gold/by-phone", {
    params: { phone },
  });

  return res.data?.purchases ?? [];
};

/** Purchases that still have lines without inventory, with only those lines (INV-16). */
export const getPurchasesPendingInventory = async ({ purchaseType, search } = {}) => {
  const res = await http.get("/api/purchases/pending-inventory", {
    params: {
      purchaseType: purchaseType && purchaseType !== "ALL" ? purchaseType : undefined,
      search: search || undefined,
    },
  });
  const list = res.data?.data ?? res.data?.purchases ?? [];
  return Array.isArray(list) ? list : [];
};

/** Lines of one purchase that are not in inventory yet. */
export const getUntaggedPurchaseItems = async (purchaseId) => {
  const res = await http.get(`/api/purchases/itemsByPurchase/${purchaseId}`, {
    params: { withoutInventory: 1 },
  });
  const rows = res.data?.purchaseItems ?? [];
  // older servers ignore the flag: drop lines that already have a piece
  return rows.filter((row) => !(Array.isArray(row.inventory) && row.inventory.length));
};
