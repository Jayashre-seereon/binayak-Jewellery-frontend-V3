import http from "./axios";

// GET ALL
export const getRates = async () => {
  const res = await http.get("/api/rates/get");
  return res.data;
};

// GET BY ID
export const getRateById = async (id) => {
  const res = await http.get(`/api/rates/getbyId/${id}`);
  return res.data;
};

// CREATE
export const addRate = async (data) => {
  const res = await http.post("/api/rates/create", data);
  return res.data;
};

// UPDATE
export const updateRate = async (id, data) => {
  const res = await http.put(`/api/rates/update/${id}`, data);
  return res.data;
};

// DELETE
export const deleteRate = async (id) => {
  const res = await http.delete(`/api/rates/delete/${id}`);
  return res.data;
};
export const normalizeRates = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.rates)) return value.rates;
  return [];
};

const dayValue = (value) => {
  if (!value) return null;
  const text = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
};

/**
 * Latest rate effective on `date` (YYYY-MM-DD) for a metal/purity, preferring an exact
 * grade match over a rate without a grade. Returns null when nothing applies.
 */
export const pickLatestRate = (rates, { metalId, purityId, gradeId, date } = {}) => {
  if (!metalId) return null;
  const onOrBefore = dayValue(date);
  const candidates = normalizeRates(rates).filter((r) => {
    if (String(r.metalId ?? r.metal?.id ?? "") !== String(metalId)) return false;
    if (purityId && String(r.purityId ?? r.purity?.id ?? "") !== String(purityId)) return false;
    const rateGrade = r.gradeId ?? r.grade?.id ?? null;
    if (rateGrade && gradeId && String(rateGrade) !== String(gradeId)) return false;
    if (rateGrade && !gradeId) return false;
    const eff = dayValue(r.effectiveDate);
    return !onOrBefore || !eff || eff <= onOrBefore;
  });
  if (!candidates.length) return null;

  const score = (r) => [
    (r.gradeId ?? r.grade?.id) && gradeId ? 1 : 0,
    dayValue(r.effectiveDate) || "",
    String(r.updatedAt || ""),
    Number(r.id || 0),
  ];
  return candidates.reduce((best, r) => {
    const a = score(r);
    const b = score(best);
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] > b[i]) return r;
      if (a[i] < b[i]) return best;
    }
    return best;
  });
};
