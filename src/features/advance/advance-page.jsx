import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  Search,
  ArrowDownLeft,
  Info,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import AdvanceTable from "./advance-table";
import { getAdvances } from "../../api/advance-api";
import { notifyError } from "@/utils/notify";

const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const money = (v) => roundMoney(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function AdvancePage() {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAdvances();
      setData(Array.isArray(result) ? result : result?.data || []);
    } catch (error) {
      notifyError(
        error?.response?.data?.message || "Failed to load customer advances"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered list
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const q = search.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.customerName?.toLowerCase().includes(q) ||
        item.contactNumber?.includes(q) ||
        String(item.id).includes(q) ||
        item.specification?.toLowerCase().includes(q);

      const status = (item.status || "").toUpperCase();
      const matchesStatus =
        statusFilter === "ALL" || status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [data, search, statusFilter]);

  // Metrics
  const summary = useMemo(() => {
    let totalAdv = 0;
    let totalAdj = 0;
    let totalBal = 0;
    let availableCount = 0;

    data.forEach((item) => {
      if (item.status === "CANCELLED") return;
      const amt = Number(item.amount || 0);
      const adj = Number(item.adjustedAmount || 0);
      const bal = Number(item.balanceAmount ?? Math.max(0, amt - adj));

      totalAdv += amt;
      totalAdj += adj;
      totalBal += bal;
      if (bal > 0.01) availableCount += 1;
    });

    return {
      totalAdv: roundMoney(totalAdv),
      totalAdj: roundMoney(totalAdj),
      totalBal: roundMoney(totalBal),
      availableCount,
    };
  }, [data]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Customer Advance Register
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              Tracking & Adjustments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor customer booking advances, amounts adjusted against sales invoices, and remaining balances.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-600"
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </Button>

          {/* SINGLE UNIFIED DOOR: RECORD ADVANCE VIA RECEIPT VOUCHER */}
          <Button
            onClick={() => navigate("/accounts/receipt?type=ADVANCE")}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold"
          >
            <Plus size={16} />
            <span>Record Advance via Receipt Voucher</span>
          </Button>
        </div>
      </div>

      {/* Clean Accounting Workflow Notice */}
      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3 text-xs text-emerald-950 shadow-xs">
        <Info size={18} className="text-emerald-700 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <div className="font-bold text-emerald-900">
            Unified Accounting Flow Enabled
          </div>
          <p className="text-emerald-800 leading-relaxed">
            All customer advance deposits are officially recorded through <strong>Receipt Voucher</strong> (Accounting → Receipt Voucher). 
            This guarantees your <strong>Cash in Hand</strong> and <strong>Bank A/C</strong> are 100% accurate. 
            Once recorded, advances automatically appear on this register and in the <strong>Sales Billing</strong> screen ready for instant deduction.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Total Advances Collected</div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(summary.totalAdv)}
            </div>
            <div className="text-[11px] text-blue-600 font-medium">Cumulative deposits</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Layers size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Adjusted Against Sales</div>
            <div className="text-xl font-bold text-purple-700 truncate">
              ₹{money(summary.totalAdj)}
            </div>
            <div className="text-[11px] text-purple-600 font-medium">Used in jewellery billing</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Available Balance</div>
            <div className="text-xl font-bold text-emerald-700 truncate">
              ₹{money(summary.totalBal)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">
              Ready for future sales
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Active Customers</div>
            <div className="text-xl font-bold text-amber-700">
              {summary.availableCount}
            </div>
            <div className="text-[11px] text-slate-500">Holding unadjusted balance</div>
          </div>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customer name, contact number, receipt reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="w-full sm:w-56">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available (Unused)</option>
            <option value="PARTIALLY_ADJUSTED">Partially Adjusted</option>
            <option value="FULLY_ADJUSTED">Fully Adjusted</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ADVANCE REGISTER TABLE */}
      <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
        <AdvanceTable data={filteredData} loading={loading} />
      </div>
    </div>
  );
}
