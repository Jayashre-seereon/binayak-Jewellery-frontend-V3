import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getStoreById } from "@/api/store-api";

/**
 * The selected store's master record (state, GSTIN, CIN…) for the GST preview.
 * Uses what the auth store already holds; ADMIN sessions fetch the full record when `state` is missing.
 * STORE sessions cannot call /api/stores/getById, so `learnFrom(sale.store)` lets the page fill the gap
 * from any loaded sale.
 */
export default function useStoreProfile() {
  const selectedStore = useAuthStore((s) => s.selectedStore);
  const role = useAuthStore((s) => s.role);
  const storeId = selectedStore?.id || selectedStore?.storeId || localStorage.getItem("selectedStoreId");
  const [fetched, setFetched] = useState(null);
  const [learned, setLearned] = useState(null);

  const needsFetch = Boolean(storeId) && !selectedStore?.state && role === "ADMIN";

  useEffect(() => {
    if (!needsFetch) return undefined;
    let alive = true;
    getStoreById(storeId)
      .then((res) => {
        const store = res?.data?.data || res?.data?.store || res?.data;
        if (alive && store && typeof store === "object") setFetched({ ...store, _for: String(storeId) });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [needsFetch, storeId]);

  const pick = (candidate) => (candidate && String(candidate.id ?? candidate._for) === String(storeId) ? candidate : null);
  const profile = {
    ...(pick(learned) || {}),
    ...(pick(fetched) || {}),
    ...(selectedStore || {}),
  };
  const state = selectedStore?.state || pick(fetched)?.state || pick(learned)?.state || "";

  return {
    storeId,
    store: profile,
    storeState: String(state || "").trim().toUpperCase(),
    learnFrom: (store) => {
      if (store?.state && String(store.id) === String(storeId) && !learned?.state) setLearned(store);
    },
  };
}
