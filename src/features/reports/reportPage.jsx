import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { FileDown, FileSpreadsheet, LayoutGrid, Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import ReportTable from "./reportTable";
import ReportsCenter from "./engine/reports-center";
import { PERIOD_OPTIONS, errorMessage, formatMoney, formatWeight, netWeightOf, saleInvoiceValue, saleTax, saveBlobResponse } from "./engine/report-utils";
import {
  getSalesReport,
  getPurchaseReport,
  exportSalesReportPdfApi,
  exportPurchaseReportPdfApi,
  exportSalesReportExcelApi,
  exportPurchaseReportExcelApi,
} from "@/api/reportApi";

const purchaseTypeOptions = [
  { label: "All Purchase Types", value: "" },
  { label: "Ornament", value: "ORNAMENT" },
  { label: "Old Gold / URD", value: "OLD" },
  { label: "Bullion", value: "BULLION" },
];

const TABS = [
  { key: "sales", label: "Sales Report" },
  { key: "purchase", label: "Purchase Report" },
  { key: "all", label: "All Reports", icon: LayoutGrid },
];

const selectClass = "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm focus:border-blue-500 focus:outline-none";
const labelClass = "text-[11px] font-semibold uppercase tracking-wide text-slate-500";
const sum = (list, fn) => list.reduce((t, r) => t + (Number(fn(r)) || 0), 0);

export default function ReportPage() {
  const [params, setParams] = useSearchParams();
  const activeTab = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "sales";

  const [period, setPeriod] = useState("THIS_MONTH");
  const [purchaseType, setPurchaseType] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [search, setSearch] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(null);
  const requestId = useRef(0);

  const setTab = (tab) => {
    const next = new URLSearchParams(params);
    next.set("tab", tab);
    if (tab !== "all") next.delete("r");
    setParams(next);
    setSearch("");
  };

  const buildParams = useCallback(() => {
    const p = { period };
    if (period === "CUSTOM") {
      p.fromDate = fromDate;
      p.toDate = toDate;
    }
    if (activeTab === "purchase" && purchaseType) p.purchaseType = purchaseType;
    return p;
  }, [period, fromDate, toDate, activeTab, purchaseType]);

  const loadReport = useCallback(async () => {
    if (activeTab === "all") return;
    if (period === "CUSTOM" && (!fromDate || !toDate)) return;
    if (period === "CUSTOM" && fromDate > toDate) {
      toast.error("From Date cannot be after To Date.");
      return;
    }
    const id = ++requestId.current;
    setLoading(true);
    try {
      const response = activeTab === "sales" ? await getSalesReport(buildParams()) : await getPurchaseReport(buildParams());
      if (id !== requestId.current) return;
      setData(response?.sales || response?.purchases || response?.records || response?.data || []);
    } catch (error) {
      if (id !== requestId.current) return;
      setData([]);
      toast.error(await errorMessage(error, "Unable to load the report."));
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [activeTab, period, fromDate, toDate, buildParams]);

  // auto-load on tab / period / type changes (custom range waits for Apply)
  useEffect(() => {
    if (activeTab === "all" || period === "CUSTOM") return;
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, period, purchaseType]);

  const changePeriod = (value) => {
    setPeriod(value);
    if (value === "CUSTOM") {
      // never show the previous period's figures under a custom range that has not been applied
      requestId.current += 1;
      setData([]);
      setLoading(false);
    } else {
      setFromDate("");
      setToDate("");
    }
  };

  const filteredData = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (r) =>
        r.invoiceNo?.toLowerCase().includes(q) ||
        r.customerName?.toLowerCase().includes(q) ||
        String(r.customerPhone || "").includes(q) ||
        r.party?.name?.toLowerCase().includes(q)
    );
  }, [search, data]);

  const handleExport = async (format) => {
    if (period === "CUSTOM" && (!fromDate || !toDate)) {
      toast.error("Please select both From Date and To Date.");
      return;
    }
    setExporting(format);
    try {
      const api =
        activeTab === "sales"
          ? format === "pdf"
            ? exportSalesReportPdfApi
            : exportSalesReportExcelApi
          : format === "pdf"
            ? exportPurchaseReportPdfApi
            : exportPurchaseReportExcelApi;
      const response = await api(buildParams());
      saveBlobResponse(response, `${activeTab === "sales" ? "Sales" : "Purchase"}_Report_${period}.${format}`);
      toast.success(`${format === "pdf" ? "PDF" : "Excel"} report downloaded.`);
    } catch (error) {
      toast.error(await errorMessage(error, `Failed to download the ${format === "pdf" ? "PDF" : "Excel"} report.`));
    } finally {
      setExporting(null);
    }
  };

  // KPIs are computed from the rows on screen so the cards always agree with the table.
  const summaryCards = useMemo(() => {
    if (activeTab === "sales") {
      const live = data.filter((s) => s.status !== "CANCELLED");
      const cancelled = data.length - live.length;
      return [
        { title: "Invoice Value", value: formatMoney(sum(live, saleInvoiceValue)) },
        { title: "Invoices", value: live.length.toLocaleString("en-IN") + (cancelled ? `  (+${cancelled} cancelled)` : "") },
        { title: "Net Weight (g)", value: formatWeight(sum(live, netWeightOf)) },
        { title: "GST", value: formatMoney(sum(live, saleTax)) },
        { title: "Collected", value: formatMoney(sum(live, (s) => s.paidAmount)) },
        { title: "Outstanding", value: formatMoney(sum(live, (s) => s.dueAmount)) },
      ];
    }
    return [
      { title: "Net Purchase", value: formatMoney(sum(data, (p) => p.netPayable ?? p.totalAmount)) },
      { title: "Bills", value: data.length.toLocaleString("en-IN") },
      { title: "Net Weight (g)", value: formatWeight(sum(data, netWeightOf)) },
      { title: "GST", value: formatMoney(sum(data, (p) => p.taxAmount)) },
      { title: "Paid", value: formatMoney(sum(data, (p) => p.paidAmount)) },
      { title: "Amount Owed", value: formatMoney(sum(data, (p) => p.dueAmount)) },
    ];
  }, [activeTab, data]);

  const customIncomplete = period === "CUSTOM" && (!fromDate || !toDate);

  return (
    <div className="w-full min-w-0 space-y-5 p-2">
      {/* HEADER + TABS */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
          <p className="text-xs text-slate-500">Every report can be viewed on screen and downloaded as a branded PDF or an Excel workbook.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  activeTab === t.key ? "bg-white text-blue-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t.icon && <t.icon size={13} />}
                {t.label}
              </button>
            ))}
          </div>
          {activeTab !== "all" && (
            <>
              <Button
                variant="outline"
                className="h-9 gap-2 border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:text-rose-800"
                onClick={() => handleExport("pdf")}
                disabled={Boolean(exporting) || loading}
              >
                {exporting === "pdf" ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
                {exporting === "pdf" ? "Preparing…" : "Download PDF"}
              </Button>
              <Button
                variant="outline"
                className="h-9 gap-2 border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800"
                onClick={() => handleExport("xlsx")}
                disabled={Boolean(exporting) || loading}
              >
                {exporting === "xlsx" ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
                {exporting === "xlsx" ? "Preparing…" : "Download Excel"}
              </Button>
            </>
          )}
        </div>
      </div>

      {activeTab === "all" ? (
        <ReportsCenter />
      ) : (
        <>
          {/* FILTER */}
          <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className={labelClass}>Period</label>
                <select className={selectClass} value={period} onChange={(e) => changePeriod(e.target.value)}>
                  {PERIOD_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
              {period === "CUSTOM" && (
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
              {activeTab === "purchase" && (
                <div>
                  <label className={labelClass}>Purchase Type</label>
                  <select className={selectClass} value={purchaseType} onChange={(e) => setPurchaseType(e.target.value)}>
                    {purchaseTypeOptions.map((item) => (
                      <option key={item.value} value={item.value}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-end">
                <Button className="h-9 w-full" onClick={loadReport} disabled={loading || customIncomplete}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Apply Filter
                </Button>
              </div>
            </div>
            {customIncomplete && <p className="mt-2 text-xs text-amber-700">Select both From and To dates, then Apply.</p>}
          </div>

          {/* SUMMARY */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {summaryCards.map((item) => (
              <div key={item.title} className="relative overflow-hidden rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                <span className="absolute inset-y-3 left-0 w-1 rounded-r bg-amber-500" />
                <p className="pl-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{item.title}</p>
                <p className="mt-1 truncate pl-1.5 text-lg font-bold text-slate-900 tabular-nums">{item.value}</p>
              </div>
            ))}
          </div>

          {/* TABLE */}
          <div className="w-full min-w-0 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
            <div className="flex flex-col gap-2 border-b border-slate-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder={activeTab === "sales" ? "Search invoice, customer or phone…" : "Search invoice, party or phone…"}
                  className="h-8 pl-8 text-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <span className="whitespace-nowrap text-xs text-slate-500">{filteredData.length.toLocaleString("en-IN")} records</span>
            </div>
            <ReportTable type={activeTab} data={filteredData} loading={loading} />
          </div>
        </>
      )}
    </div>
  );
}
