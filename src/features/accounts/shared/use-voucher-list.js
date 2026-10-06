import { useCallback, useEffect, useRef, useState } from "react";
import dayjs from "dayjs";
import { notifyError } from "@/utils/notify";

export const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

/** Today's date in the browser's time zone (not the UTC date from toISOString). */
export const localToday = () => dayjs().format("YYYY-MM-DD");

/**
 * Server-paginated voucher list (ACC-20): page/limit/total from the API, a date range,
 * a debounced search and a stale-response guard. `filters` holds the other query params
 * (status, paymentMode, referenceType…); "ALL" / "" values are not sent.
 */
export function useVoucherList(fetcher, filters, { errorMessage = "Could not load vouchers." } = {}) {
  const [vouchers, setVouchers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [search, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [startDate, setStartDateState] = useState("");
  const [endDate, setEndDateState] = useState("");
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);
  const timer = useRef(null);
  const filterKey = JSON.stringify(filters || {});

  const fetchPage = useCallback(() => {
    const id = ++requestId.current;
    const params = { page, limit: PAGE_SIZE };
    Object.entries(JSON.parse(filterKey)).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "" && v !== "ALL") params[k] = v;
    });
    if (debouncedSearch) params.search = debouncedSearch;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return fetcher(params)
      .then((res) => {
        if (id !== requestId.current) return;
        const list = res?.vouchers || res?.data || [];
        setVouchers(Array.isArray(list) ? list : []);
        const p = res?.pagination || {};
        const total = Number(p.total ?? list.length ?? 0);
        setPagination({
          page: Number(p.page || page),
          limit: Number(p.limit || PAGE_SIZE),
          total,
          totalPages: Math.max(1, Number(p.totalPages || Math.ceil(total / PAGE_SIZE) || 1)),
        });
      })
      .catch((err) => {
        if (id === requestId.current) notifyError(err, errorMessage);
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [fetcher, filterKey, page, debouncedSearch, startDate, endDate, errorMessage]);

  useEffect(() => {
    fetchPage();
  }, [fetchPage]);

  useEffect(() => () => clearTimeout(timer.current), []);

  // Changing a filter goes back to page 1.
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setPage(1);
    setLoading(true);
  }

  const setSearch = (value) => {
    setSearchText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      setPage(1);
      setDebouncedSearch(value.trim());
    }, SEARCH_DEBOUNCE_MS);
  };

  const setStartDate = (value) => {
    setLoading(true);
    setPage(1);
    setStartDateState(value);
  };

  const setEndDate = (value) => {
    setLoading(true);
    setPage(1);
    setEndDateState(value);
  };

  const goToPage = (next) => {
    const target = Math.min(Math.max(1, next), pagination.totalPages || 1);
    if (target === page) return;
    setLoading(true);
    setPage(target);
  };

  const reload = () => {
    setLoading(true);
    return fetchPage();
  };

  return {
    vouchers,
    pagination,
    page,
    loading,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    goToPage,
    reload,
  };
}
