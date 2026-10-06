import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileSpreadsheet, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/utils/notify";
import {
  downloadStockSummaryReport,
  getReportDefinition,
  getStockSummaryReport,
} from "@/api/stock-api";

// Used until the report catalog answers (and if it is unavailable).
const FALLBACK_FILTERS = [
  {
    name: "groupBy",
    label: "Group By",
    type: "select",
    default: "PRODUCT",
    options: [
      { value: "PRODUCT", label: "Metal → Purity → Product" },
      { value: "ITEM", label: "Metal → Purity → Item" },
      { value: "PURITY", label: "Metal → Purity" },
    ],
  },
  {
    name: "status",
    label: "Stock Status",
    type: "select",
    default: "AVAILABLE",
    options: [
      { value: "AVAILABLE", label: "Available" },
      { value: "RESERVED", label: "Reserved" },
      { value: "PENDING", label: "In Transit" },
      { value: "SOLD", label: "Sold" },
      { value: "DAMAGED", label: "Damaged" },
      { value: "MELTED", label: "Melted" },
      { value: "REFINED", label: "Refined" },
    ],
  },
  {
    name: "purchaseType",
    label: "Purchase Type",
    type: "select",
    default: "ALL",
    options: [
      { value: "ALL", label: "All" },
      { value: "ORNAMENT", label: "Ornament" },
      { value: "BULLION", label: "Bullion" },
      { value: "OLD", label: "Old Gold / URD" },
    ],
  },
];

const defaultsOf = (filters) =>
  Object.fromEntries(filters.filter((f) => f.default !== undefined).map((f) => [f.name, String(f.default)]));

const formatCell = (value, type) => {
  if (value === null || value === undefined || value === "") return "";
  switch (type) {
    case "weight":
      return Number(value).toFixed(3);
    case "money":
      return `₹${Number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "number":
      return Number(value).toLocaleString("en-IN");
    case "percent":
      return `${Number(value).toFixed(2)}%`;
    case "date":
      return new Date(value).toLocaleDateString("en-IN");
    default:
      return String(value);
  }
};

const alignOf = (col) =>
  col.align || (["weight", "money", "number", "percent"].includes(col.type) ? "right" : "left");

/** Turns a blob error body back into the server's message. */
const blobErrorMessage = async (error) => {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      return JSON.parse(await data.text())?.message;
    } catch {
      return null;
    }
  }
  return null;
};

export default function StockSummaryPage() {
  const [filters, setFilters] = useState(FALLBACK_FILTERS);
  const [values, setValues] = useState(() => defaultsOf(FALLBACK_FILTERS));
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);
  const requestId = useRef(0);

  const load = useCallback((params) => {
    const id = ++requestId.current;
    return getStockSummaryReport(params)
      .then((data) => {
        if (id === requestId.current) setReport(data);
      })
      .catch((error) => {
        if (id === requestId.current) {
          setReport(null);
          notifyError(error, "Failed to load the stock summary.");
        }
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    let active = true;
    load(defaultsOf(FALLBACK_FILTERS));
    getReportDefinition("stock-summary")
      .then((def) => {
        if (!active || !def?.filters?.length) return;
        setFilters(def.filters.filter((f) => f.type === "select" && Array.isArray(f.options)));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [load]);

  const changeFilter = (name, value) => {
    const next = { ...values, [name]: value };
    setValues(next);
    setLoading(true);
    load(next);
  };

  const download = async (format) => {
    setDownloading(format);
    try {
      const { blob, filename } = await downloadStockSummaryReport(format, values);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      const message = await blobErrorMessage(error);
      notifyError(message ? { message } : error, `Failed to download the ${format.toUpperCase()} file.`);
    } finally {
      setDownloading(null);
    }
  };

  const columns = report?.columns || [];
  const rows = report?.rows || [];
  const totals = report?.totals || {};
  const hasTotals = Object.keys(totals).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Stock Summary</h1>
          {report?.meta ? (
            <p className="text-xs text-slate-500">
              {report.meta.store?.storeName || report.meta.store?.name || report.meta.store || ""}
              {report.meta.generatedAt ? ` · generated ${new Date(report.meta.generatedAt).toLocaleString("en-IN")}` : ""}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
              setLoading(true);
              load(values);
            }} disabled={loading}>
            <RefreshCw size={14} /> Refresh
          </Button>
          <Button variant="outline" onClick={() => download("xlsx")} disabled={Boolean(downloading)}>
            <FileSpreadsheet size={14} /> {downloading === "xlsx" ? "Preparing..." : "Excel"}
          </Button>
          <Button onClick={() => download("pdf")} disabled={Boolean(downloading)}>
            <Download size={14} /> {downloading === "pdf" ? "Preparing..." : "PDF"}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 rounded border bg-white p-4 md:grid-cols-3">
        {filters.map((f) => (
          <div key={f.name} className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-600">{f.label || f.name}</label>
            <select
              className="h-10 rounded border px-2"
              value={values[f.name] ?? String(f.default ?? "")}
              onChange={(e) => changeFilter(f.name, e.target.value)}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {report?.summary?.length ? (
        <div className="grid gap-3 md:grid-cols-4">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded border bg-white p-3">
              <div className="text-xs text-slate-500">{s.label}</div>
              <div className="text-lg font-semibold">{formatCell(s.value, s.type)}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="p-3" style={{ textAlign: alignOf(col) }}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="p-4 text-center text-slate-500">
                  Loading stock summary...
                </td>
              </tr>
            ) : null}
            {!loading && !rows.length ? (
              <tr>
                <td colSpan={Math.max(columns.length, 1)} className="p-4 text-center text-slate-500">
                  No stock matches these filters.
                </td>
              </tr>
            ) : null}
            {!loading &&
              rows.map((row, index) => {
                if (row._kind === "group") {
                  return (
                    <tr key={`g-${index}`} className="border-t bg-amber-50">
                      <td colSpan={columns.length} className="p-2 font-semibold text-amber-900">
                        {row._label}
                      </td>
                    </tr>
                  );
                }
                const subtotal = row._kind === "subtotal";
                return (
                  <tr
                    key={`r-${index}`}
                    className={`border-t ${subtotal ? (row._strong ? "bg-slate-100 font-semibold" : "bg-slate-50 font-medium") : ""}`}
                  >
                    {columns.map((col, ci) => (
                      <td key={col.key} className="p-2" style={{ textAlign: alignOf(col) }}>
                        {subtotal && ci === 0 ? row._label : subtotal && col.type === "text" ? "" : formatCell(row[col.key], col.type)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
          {!loading && hasTotals ? (
            <tfoot>
              <tr className="border-t-2 bg-slate-100 font-semibold">
                {columns.map((col, ci) => (
                  <td key={col.key} className="p-2" style={{ textAlign: alignOf(col) }}>
                    {ci === 0 ? "Grand Total" : formatCell(totals[col.key], col.type)}
                  </td>
                ))}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>
      {report?.meta?.rowCount !== undefined ? (
        <p className="text-xs text-slate-500">{report.meta.rowCount} rows</p>
      ) : null}
    </div>
  );
}
