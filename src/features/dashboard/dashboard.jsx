import { useState, useEffect, useCallback, useRef } from "react";
import {
  Coins,
  ShoppingBag,
  CreditCard,
  Wallet,
  Scale,
  RotateCcw,
  FileText,
  ChevronRight,
  ArrowUpRight,
  BellRing,
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Button } from "@/components/ui/button";
import { getActiveStoreId, useAuthStore } from "@/store/authStore";
import { getDashboardSummary } from "@/api/dashboard-api";
import { notifyError } from "@/utils/notify";

const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const money = (v) => roundMoney(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const weight = (v) => (Math.round((Number(v || 0) + Number.EPSILON) * 1000) / 1000).toFixed(3);

// Standard board slots; any other configured rate gets its own tile after these.
const RATE_SLOTS = [
  { key: "gold-24", label: "24K Gold", metal: /gold/i, purity: /24|999|995/ },
  { key: "gold-22", label: "22K Gold", metal: /gold/i, purity: /22|916/ },
  { key: "gold-18", label: "18K Gold", metal: /gold/i, purity: /18|750/ },
  { key: "silver", label: "Silver", metal: /silver/i, purity: null },
];

const newestFirst = (a, b) => String(b.effectiveDate || "").localeCompare(String(a.effectiveDate || ""));

/** Live-rate tiles from `data.rates` (CONTRACT §8). A missing rate shows "Not set". */
const buildRateTiles = (rates) => {
  const list = (Array.isArray(rates) ? rates : []).filter((r) => Number(r.saleRate) > 0).sort(newestFirst);
  const used = new Set();
  const tiles = RATE_SLOTS.map((slot) => {
    const rate = list.find(
      (r) =>
        !used.has(r) &&
        slot.metal.test(r.metalName || "") &&
        (!slot.purity || slot.purity.test(r.purityName || ""))
    );
    if (rate) used.add(rate);
    return { key: slot.key, label: slot.label, rate: rate || null };
  });
  list
    .filter((r) => !used.has(r))
    .forEach((r, i) =>
      tiles.push({
        key: `extra-${i}`,
        label: [r.metalName, r.purityName, r.gradeName].filter(Boolean).join(" "),
        rate: r,
      })
    );
  return tiles;
};

export default function Dashboard() {
  const selectedStore = useAuthStore((state) => state.selectedStore);
  const storeId = getActiveStoreId();

  const [period, setPeriod] = useState("this_month");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const requestId = useRef(0);

  const fetchDashboard = useCallback(() => {
    const id = ++requestId.current;
    return getDashboardSummary({ period })
      .then((res) => {
        if (id === requestId.current) setData(res);
      })
      .catch((err) => {
        if (id === requestId.current) notifyError(err, "Failed to load dashboard data");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, [period]);

  const loadDashboard = () => {
    setLoading(true);
    fetchDashboard();
  };

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard, storeId]);

  const changePeriod = (key) => {
    setLoading(true);
    setPeriod(key);
  };

  const sales = data?.sales || {};
  const inventory = data?.inventory || {};
  const advances = data?.customerAdvances || {};
  const supplierDues = data?.supplierDues || {};
  const rateTiles = buildRateTiles(data?.rates);
  const stockByMetal = Array.isArray(data?.stockByMetal) ? data.stockByMetal : [];
  const stockAlerts = Array.isArray(data?.stockAlerts) ? data.stockAlerts : [];
  const storeName = selectedStore?.storeName || selectedStore?.name || data?.storeName || "";
  const salesTrend = data?.salesTrend || [];
  const recentSales = data?.recentSales || [];

  const periodLabels = {
    today: "Today",
    this_week: "This Week",
    this_month: "This Month",
  };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* =========================================================
          1. HEADER & PERIOD FILTER (Today, This Week, This Month)
      ========================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {storeName ? `${storeName} • ` : ""}Real-time overview & sales
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 3 Simple Filters */}
          <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center gap-1">
            {[
              { key: "today", label: "Today" },
              { key: "this_week", label: "This Week" },
              { key: "this_month", label: "This Month" },
            ].map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => changePeriod(p.key)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  period === p.key
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={loadDashboard}
            disabled={loading}
            className="h-9 gap-1.5 text-xs text-slate-600 border-slate-200"
          >
            <RotateCcw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {stockAlerts.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-xs" aria-label="Stock alerts">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BellRing size={17} className="text-amber-700" />
              <h2 className="text-sm font-bold text-slate-900">Stock Alerts</h2>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-amber-800">{stockAlerts.length}</span>
            </div>
            <Link to="/inventory/inventory" className="text-xs font-semibold text-blue-700 underline">View stock</Link>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {stockAlerts.slice(0, 12).map((alert, index) => (
              <div key={`${alert.name}-${index}`} className={`rounded-xl border bg-white px-3 py-2.5 ${alert.status === "SOLD_OUT" ? "border-red-200" : "border-amber-200"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-bold text-slate-800">{alert.name}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${alert.status === "SOLD_OUT" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-800"}`}>
                    {alert.status === "SOLD_OUT" ? "Sold Out" : "Low Stock"}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-slate-600">
                  Total {alert.totalStock} Pcs · Sold {alert.sold} Pcs · Available {alert.available} Pcs
                </p>
              </div>
            ))}
          </div>
          {stockAlerts.length > 12 && <p className="mt-2 text-[11px] text-slate-500">And {stockAlerts.length - 12} more stock alerts.</p>}
          <p className="mt-2 text-[10px] text-slate-500">Low stock means 50 pieces or fewer remaining.</p>
        </section>
      )}

      {/* =========================================================
          2. LIVE GOLD & SILVER RATES
      ========================================================= */}
     <div className="bg-linear-to-r from-slate-950 via-blue-950 to-blue-900 rounded-2xl p-4 text-white shadow-xs">    <div className="flex items-center justify-between border-b border-amber-400/40 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-amber-100" />
            <span className="text-xs uppercase font-bold tracking-wider text-amber-100">
              Live Gold & Silver Rates
            </span>
          </div>
          <Link
            to="/accounts/rate"
            className="text-xs text-amber-100 hover:text-white underline flex items-center gap-1 font-medium"
          >
            <span>Rate Master</span>
            <ArrowUpRight size={13} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {rateTiles.map((tile) => (
            <div key={tile.key} className="bg-white/10 backdrop-blur-xs rounded-xl p-3 border border-white/15">
              <div className="text-[11px] font-semibold text-amber-100">{tile.label}</div>
              {tile.rate ? (
                <>
                  <div className="text-xl font-bold mt-0.5">
                    ₹{money(tile.rate.saleRate)}
                    <span className="text-xs font-normal text-amber-100 ml-1">/gm</span>
                  </div>
                  <div className="text-[10px] text-amber-100/80 mt-0.5">
                    {Number(tile.rate.exchangeRate) > 0 ? `Exch ₹${money(tile.rate.exchangeRate)} · ` : ""}
                    {tile.rate.effectiveDate
                      ? `w.e.f. ${new Date(tile.rate.effectiveDate).toLocaleDateString("en-IN")}`
                      : ""}
                  </div>
                </>
              ) : (
                <div className="text-lg font-semibold mt-0.5 text-amber-100/70">Not set</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* =========================================================
          3. FOUR SIMPLE KPI CARDS
      ========================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
            <ShoppingBag size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">
              Total Sales ({periodLabels[period] || "Period"})
            </div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(sales.totalRevenue || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate">
              <strong className="text-emerald-700 font-semibold">{weight(sales.netWeightSold || 0)} gm</strong>
              {" • "}{sales.invoicesCount || 0} bill(s)
            </div>
          </div>
        </div>

        {/* Current Stock */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
            <Scale size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Current Stock</div>
            {stockByMetal.length ? (
              <div className="mt-0.5 space-y-0.5">
                {stockByMetal.map((m) => (
                  <div key={m.metalName || "unspecified"} className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="font-semibold text-slate-800 truncate">{m.metalName || "Unspecified"}</span>
                    <span className="text-slate-900 font-bold whitespace-nowrap">
                      {weight(m.netWeight || 0)} gm
                      <span className="ml-1 text-[11px] font-normal text-slate-500">({m.pieces || 0} pcs)</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="text-xl font-bold text-slate-900 truncate">
                  {weight(inventory.totalNetWeight || 0)} gm
                  {inventory.totalPieces ? (
                    <span className="ml-1 text-[11px] font-normal text-slate-500">all metals</span>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {inventory.totalPieces || 0} item(s) in vault
                </div>
              </>
            )}
          </div>
        </div>

        {/* Customer Advances */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0 border border-teal-100">
            <CreditCard size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Customer Advances</div>
            <div className="text-xl font-bold text-teal-800 truncate">
              ₹{money(advances.totalAvailableBalance || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {advances.activeAdvancesCount || 0} active advance(s)
            </div>
          </div>
        </div>

        {/* Supplier Dues */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-xs flex items-center gap-3.5">
          <div className="h-11 w-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
            <Wallet size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Supplier Dues</div>
            <div className="text-xl font-bold text-purple-700 truncate">
              ₹{money(supplierDues.totalSupplierDue || 0)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {supplierDues.pendingPurchasesCount || 0} pending purchase(s)
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================
          4. DYNAMIC SALES OVERVIEW GRAPH (ADAPTS TO FILTER)
      ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Sales Overview ({periodLabels[period] || "Period"})
            </h3>
            <p className="text-xs text-slate-500">
              {period === "today"
                ? "Today's sales breakdown by time"
                : period === "this_week"
                ? "Daily sales performance for this week (Mon - Sun)"
                : "Daily sales performance for this month"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200">
              Total: ₹{money(sales.totalRevenue || 0)}
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          {salesTrend.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
              No sales data for {periodLabels[period]}.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey={period === "today" ? "name" : "shortName"}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                />
                <RechartsTooltip
                  formatter={(value) => [`₹${money(value)}`, "Sales"]}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]?.payload?.name) {
                      return payload[0].payload.name;
                    }
                    return label;
                  }}
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    color: "#fff",
                    borderRadius: "8px",
                    fontSize: "12px",
                    border: "none",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name="Sales"
                  stroke="#d97706"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* =========================================================
          5. RECENT SALES
      ========================================================= */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText size={16} className="text-blue-600" />
              <span>Recent Sales</span>
            </h3>
            <p className="text-xs text-slate-500">Latest completed showroom billings</p>
          </div>
          <Link
            to="/sales"
            className="text-xs text-blue-600 hover:text-blue-800 underline font-medium flex items-center gap-1"
          >
            <span>View All</span>
            <ChevronRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b text-slate-600 font-semibold">
              <tr>
                <th className="p-3">Invoice</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3 text-right">Net Payable</th>
                <th className="p-3 text-right">Paid</th>
                <th className="p-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                    No sales recorded yet.
                  </td>
                </tr>
              ) : (
                recentSales.map((s) => {
                  const isDue = Number(s.dueAmount || 0) > 0.01;
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-3 font-mono font-bold text-blue-700">{s.invoiceNo}</td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-900 truncate max-w-[150px]">
                          {s.customerName || "Customer"}
                        </div>
                        {s.customerPhone && (
                          <div className="text-[10px] text-slate-400">{s.customerPhone}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-600">
                        {s.saleDate ? new Date(s.saleDate).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-slate-900">
                        ₹{money(s.netPayable)}
                      </td>
                      <td className="p-3 text-right font-mono font-semibold text-emerald-700">
                        ₹{money(s.paidAmount)}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDue
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isDue ? `Due: ₹${money(s.dueAmount)}` : "Paid"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
