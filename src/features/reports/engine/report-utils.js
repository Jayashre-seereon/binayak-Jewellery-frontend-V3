// Formatting + download helpers shared by every report screen.

const num2 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num3 = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const num0 = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const finite = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatMoney = (v) => {
  const n = finite(v);
  return `${n < -0.004 ? "-" : ""}₹${num2.format(Math.abs(n) < 0.005 ? 0 : Math.abs(n))}`;
};
export const formatWeight = (v) => num3.format(finite(v));

/** Dates arrive as IST calendar keys ("2026-10-03" or "2026-10" for months). */
export const formatDate = (v) => {
  if (!v) return "";
  const s = String(v);
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[3]} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  m = s.match(/^(\d{4})-(\d{2})$/);
  if (m) return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
};

export const formatValue = (value, type) => {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "money":
      return formatMoney(value);
    case "weight":
      return formatWeight(value);
    case "number":
      return num0.format(finite(value));
    case "percent":
      return `${num2.format(finite(value))}%`;
    case "date":
      return formatDate(value);
    default:
      return String(value);
  }
};

/** Invoice value = subTotal (+ round off); migrated sales have no subTotal and bill their net payable. */
export const saleInvoiceValue = (s) => (Number(s.subTotal) > 0 ? Number(s.subTotal) + Number(s.roundOff || 0) : Number(s.netPayable || 0));
export const saleTax = (s) => Number(s.totalTax || s.taxAmount || 0) || Number(s.cgstAmount || 0) + Number(s.sgstAmount || 0) + Number(s.igstAmount || 0);
export const netWeightOf = (r) => (r.items || []).reduce((t, i) => t + Number(i.netWeight || i.inventory?.netWeight || 0), 0);

export const isNumeric = (type) => ["money", "weight", "number", "percent"].includes(type);

/** Pulls a readable message out of an axios error (including JSON errors returned as Blob). */
export const errorMessage = async (error, fallback = "Something went wrong.") => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text());
      return parsed?.message || fallback;
    } catch {
      return fallback;
    }
  }
  return data?.message || error?.message || fallback;
};

const filenameFrom = (headers, fallback) => {
  const cd = headers?.["content-disposition"] || headers?.get?.("content-disposition") || "";
  const star = cd.match(/filename\*=UTF-8''([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim());
    } catch {
      /* fall through */
    }
  }
  const plain = cd.match(/filename="?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallback;
};

/** Saves an axios blob response as a file named from Content-Disposition. */
export const saveBlobResponse = (response, fallbackName) => {
  const type = response.headers?.["content-type"] || "application/octet-stream";
  const blob = response.data instanceof Blob ? response.data : new Blob([response.data], { type });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filenameFrom(response.headers, fallbackName));
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 10000);
};

export const PERIOD_OPTIONS = [
  { label: "Today", value: "TODAY" },
  { label: "Yesterday", value: "YESTERDAY" },
  { label: "This Week", value: "THIS_WEEK" },
  { label: "Last Week", value: "LAST_WEEK" },
  { label: "This Month", value: "THIS_MONTH" },
  { label: "Last Month", value: "LAST_MONTH" },
  { label: "This Quarter", value: "THIS_QUARTER" },
  { label: "Last Quarter", value: "LAST_QUARTER" },
  { label: "This Year", value: "THIS_YEAR" },
  { label: "Last Year", value: "LAST_YEAR" },
  { label: "All Time", value: "ALL" },
  { label: "Custom Range", value: "CUSTOM" },
];
