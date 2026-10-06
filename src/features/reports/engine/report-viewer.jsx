import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Table } from "antd";
import { toast } from "sonner";
import { ArrowLeft, FileDown, FileSpreadsheet, Info, Loader2, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getReportData, downloadReportApi } from "@/api/reportApi";
import { useReportCatalogue } from "./use-report-catalogue";
import { PERIOD_OPTIONS, errorMessage, formatValue, isNumeric, saveBlobResponse } from "./report-utils";

const selectClass = "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800 focus:border-blue-500 focus:outline-none";
const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";

const defaultsOf = (def, initial = {}) => {
  const out = {};
  for (const f of def?.filters || []) {
    if (initial[f.name] !== undefined) out[f.name] = initial[f.name];
    else if (f.type === "boolean") out[f.name] = Boolean(f.default);
    else out[f.name] = f.default ?? "";
  }
  return out;
};

const toParams = (period, fromDate, toDate, filters, def) => {
  const params = {};
  if (def?.period !== "none") {
    params.period = period;
    if (period === "CUSTOM") {
      params.fromDate = fromDate;
      params.toDate = toDate;
    }
  }
  for (const f of def?.filters || []) {
    const v = filters[f.name];
    if (f.type === "boolean") params[f.name] = v ? "1" : "0";
    else if (v !== undefined && v !== null && String(v).trim() !== "") params[f.name] = String(v).trim();
  }
  return params;
};

function SummaryCards({ items = [] }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {items.map((s) => (
        <div key={s.label} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
          <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-amber-500" />
          <p className="truncate pl-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500" title={s.label}>
            {s.label}
          </p>
          <p className="mt-1 truncate pl-1.5 text-lg font-bold text-slate-900 tabular-nums">
            {s.type === "text" ? s.value : formatValue(s.value, s.type) || (s.type === "date" ? "—" : "0")}
          </p>
        </div>
      ))}
    </div>
  );
}

function FilterField({ filter, value, onChange, onEnter }) {
  if (filter.type === "boolean") {
    return (
      <label className="flex h-9 cursor-pointer items-center gap-2 self-end rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700">
        <input type="checkbox" className="size-4 accent-blue-600" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} />
        <span className="truncate">{filter.label}</span>
      </label>
    );
  }
  if (filter.type === "select") {
    return (
      <div>
        <label className={labelClass}>{filter.label}</label>
        <select className={selectClass} value={value} onChange={(e) => onChange(e.target.value)}>
          {(filter.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label className={labelClass}>{filter.label}</label>
      <Input className="mt-1 h-9" value={value} placeholder={filter.label} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onEnter()} />
    </div>
  );
}

/**
 * Generic report screen for any report in the engine catalogue.
 * props: reportKey, initialFilters, onBack (shows a back link when given)
 */
export default function ReportViewer({ reportKey, initialFilters, onBack }) {
  const { catalogue, loading, error } = useReportCatalogue();
  const def = useMemo(() => catalogue.find((r) => r.key === reportKey), [catalogue, reportKey]);

  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;
  if (!def) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white p-6 text-sm text-slate-500">
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Loading report…
          </>
        ) : (
          `Report "${reportKey}" is not available.`
        )}
      </div>
    );
  }
  // keyed by report so switching reports starts from that report's defaults
  return <ReportScreen key={def.key} def={def} initialFilters={initialFilters} onBack={onBack} />;
}

function ReportScreen({ def, initialFilters, onBack }) {
  const [period, setPeriod] = useState(def.defaultPeriod || "THIS_MONTH");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filters, setFilters] = useState(() => defaultsOf(def, initialFilters || {}));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(null);
  const [quickSearch, setQuickSearch] = useState("");
  const [page, setPage] = useState({ current: 1, pageSize: 50 });
  const requestId = useRef(0);

  const customIncomplete = def?.period !== "none" && period === "CUSTOM" && (!fromDate || !toDate);

  const load = useCallback(
    async (override) => {
      if (!def) return;
      const p = override?.period ?? period;
      const f = override?.filters ?? filters;
      if (def.period !== "none" && p === "CUSTOM" && (!fromDate || !toDate)) return;
      if (def.period !== "none" && p === "CUSTOM" && fromDate > toDate) {
        toast.error("From Date cannot be after To Date.");
        return;
      }
      const id = ++requestId.current;
      setLoading(true);
      try {
        const result = await getReportData(def.key, toParams(p, fromDate, toDate, f, def));
        if (id !== requestId.current) return;
        setData(result);
        setPage((s) => ({ ...s, current: 1 }));
      } catch (error) {
        if (id !== requestId.current) return;
        setData(null);
        toast.error(await errorMessage(error, "Unable to load the report."));
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [def, period, filters, fromDate, toDate]
  );

  // first load with the report's defaults
  const firstLoad = useRef(load);
  useEffect(() => {
    firstLoad.current();
  }, []);

  const changePeriod = (value) => {
    setPeriod(value);
    if (value === "CUSTOM") {
      requestId.current += 1; // drop any in-flight result for the old period
      setData(null);
      setLoading(false);
      return;
    }
    setFromDate("");
    setToDate("");
    load({ period: value });
  };

  const changeFilter = (filter, value) => {
    const next = { ...filters, [filter.name]: value };
    setFilters(next);
    if (filter.type !== "text") load({ filters: next });
  };

  const download = async (format) => {
    if (!def) return;
    if (customIncomplete) {
      toast.error("Please select both From Date and To Date.");
      return;
    }
    setDownloading(format);
    try {
      const response = await downloadReportApi(def.key, toParams(period, fromDate, toDate, filters, def), format);
      saveBlobResponse(response, `${def.name}.${format}`);
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} downloaded.`);
    } catch (error) {
      toast.error(await errorMessage(error, `Unable to download the ${format === "pdf" ? "PDF" : "Excel"} file.`));
    } finally {
      setDownloading(null);
    }
  };

  const columns = useMemo(() => {
    const cols = data?.columns || [];
    const span = Math.max(1, cols.findIndex((c) => isNumeric(c.type)) === -1 ? cols.length : cols.findIndex((c) => isNumeric(c.type)));
    return cols.map((c, i) => ({
      title: c.label,
      dataIndex: c.key,
      key: c.key,
      align: c.align || (isNumeric(c.type) ? "right" : "left"),
      ellipsis: c.type === "text",
      width: c.type === "money" ? 140 : c.type === "weight" ? 110 : c.type === "date" ? 115 : c.type === "number" ? 80 : undefined,
      onCell: (row) => {
        if (row._kind === "group") return { colSpan: i === 0 ? cols.length : 0 };
        if (row._kind === "subtotal") return { colSpan: i === 0 ? span : i < span ? 0 : 1 };
        return {};
      },
      render: (value, row) => {
        if (row._kind === "group") return <span className="text-xs font-bold uppercase tracking-wider text-blue-950">{row._label}</span>;
        if (row._kind === "subtotal" && i === 0) {
          return (
            <span className={`font-semibold ${row._warn ? "text-red-700" : "text-slate-900"}`}>
              {row.date && c.type === "date" ? `${formatValue(row.date, "date")} · ` : ""}
              {row._label}
            </span>
          );
        }
        if (row._cont && ["date", "voucherNo", "type"].includes(c.key)) return "";
        const text = formatValue(value, c.type);
        if (c.key === "status" && /cancel/i.test(text)) return <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">{text}</span>;
        if ((c.type === "money" || c.type === "weight") && Math.abs(Number(value)) < 0.0005 && !row._kind) return <span className="text-slate-300">–</span>;
        return <span className={`${isNumeric(c.type) ? "tabular-nums" : ""} ${row._kind ? "font-semibold text-slate-900" : ""}`}>{text}</span>;
      },
    }));
  }, [data]);

  const rows = useMemo(() => {
    const list = (data?.rows || []).map((r, i) => ({ ...r, __key: i }));
    const q = quickSearch.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => !r._kind && Object.entries(r).some(([k, v]) => !k.startsWith("_") && v !== null && String(v).toLowerCase().includes(q)));
  }, [data, quickSearch]);

  const totals = data?.totals || {};
  const hasTotals = rows.length > 0 && Object.keys(totals).length > 0;

  const meta = data?.meta;

  return (
    <div className="w-full min-w-0 space-y-4">
      {/* header */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          {onBack && (
            <button type="button" onClick={onBack} className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-blue-700">
              <ArrowLeft size={14} /> All reports
            </button>
          )}
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{def.name}</h1>
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">{def.group}</span>
          </div>
          <p className="mt-0.5 text-xs text-slate-500">{def.description}</p>
          {meta && (
            <p className="mt-1 text-xs text-slate-600">
              <span className="font-semibold">{meta.periodLabel}</span>
              <span className="mx-1.5 text-slate-300">|</span>
              {meta.store?.storeName}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            className="h-9 gap-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
            onClick={() => download("pdf")}
            disabled={Boolean(downloading) || loading}
          >
            {downloading === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
            {downloading === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
            onClick={() => download("xlsx")}
            disabled={Boolean(downloading) || loading}
          >
            {downloading === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
            {downloading === "xlsx" ? "Preparing…" : "Download Excel"}
          </Button>
        </div>
      </div>

      {/* filters */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          {def.period !== "none" ? (
            <div>
              <label className={labelClass}>Period</label>
              <select className={selectClass} value={period} onChange={(e) => changePeriod(e.target.value)}>
                {PERIOD_OPTIONS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className={labelClass}>Position</label>
              <div className="mt-1 flex h-9 items-center rounded-lg border border-dashed border-slate-200 px-3 text-sm text-slate-500">As on today</div>
            </div>
          )}
          {def.period !== "none" && period === "CUSTOM" && (
            <>
              <div>
                <label className={labelClass}>From Date</label>
                <Input type="date" className="mt-1 h-9" value={fromDate} max={toDate || undefined} onChange={(e) => setFromDate(e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>To Date</label>
                <Input type="date" className="mt-1 h-9" value={toDate} min={fromDate || undefined} onChange={(e) => setToDate(e.target.value)} />
              </div>
            </>
          )}
          {(def.filters || []).map((f) => (
            <FilterField key={f.name} filter={f} value={filters[f.name] ?? ""} onChange={(v) => changeFilter(f, v)} onEnter={() => load()} />
          ))}
          <div className="flex items-end gap-2">
            <Button className="h-9 flex-1" onClick={() => load()} disabled={loading || customIncomplete}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
              Apply
            </Button>
          </div>
        </div>
        {customIncomplete && <p className="mt-2 text-xs text-amber-700">Select both From and To dates, then Apply.</p>}
      </div>

      <SummaryCards items={data?.summary} />

      {(meta?.notes || []).map((n) => (
        <div key={n} className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50/70 px-3 py-2 text-xs text-amber-900">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <span>{n}</span>
        </div>
      ))}

      {/* table */}
      <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
            <Input className="h-8 pl-8 text-sm" placeholder="Quick search in results…" value={quickSearch} onChange={(e) => setQuickSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-500">
            {loading ? "Loading…" : `${rows.filter((r) => !r._kind).length.toLocaleString("en-IN")} records`}
          </span>
        </div>
        <Table
          size="small"
          rowKey="__key"
          columns={columns}
          dataSource={rows}
          loading={loading}
          scroll={{ x: "max-content" }}
          sticky
          locale={{ emptyText: customIncomplete ? "Choose a date range to see this report." : "No records for the selected period and filters." }}
          rowClassName={(r) =>
            r._kind === "group" ? "[&>td]:bg-amber-50!" : r._kind === "subtotal" ? (r._warn ? "[&>td]:bg-red-50!" : "[&>td]:bg-amber-50/60!") : ""
          }
          pagination={{
            current: page.current,
            pageSize: page.pageSize,
            showSizeChanger: true,
            pageSizeOptions: [25, 50, 100, 200],
            showTotal: (t, [a, b]) => `${a}–${b} of ${t}`,
            onChange: (current, pageSize) => setPage({ current, pageSize }),
          }}
          summary={() =>
            hasTotals ? (
              <Table.Summary fixed>
                <Table.Summary.Row className="[&>td]:bg-slate-900! [&>td]:text-white!">
                  {(data?.columns || []).map((c, i) => (
                    <Table.Summary.Cell key={c.key} index={i} align={c.align || (isNumeric(c.type) ? "right" : "left")}>
                      {i === 0 ? (
                        <span className="text-xs font-bold uppercase tracking-wider text-amber-200">{data.totalsLabel || "Total"}</span>
                      ) : totals[c.key] !== undefined ? (
                        <span className="font-semibold tabular-nums">{formatValue(totals[c.key], c.type)}</span>
                      ) : null}
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              </Table.Summary>
            ) : null
          }
        />
      </div>
    </div>
  );
}
