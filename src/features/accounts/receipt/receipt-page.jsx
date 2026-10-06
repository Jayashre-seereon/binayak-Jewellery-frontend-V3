import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Printer,
  Ban,
  ArrowDownLeft,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  User,
  Phone,
  FileText,
  CreditCard,
  Building2,
  ChevronRight,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { notifySuccess, notifyError } from "@/utils/notify";
import { useVoucherList, localToday } from "../shared/use-voucher-list";
import { DateRangeFilter, VoucherPager } from "../shared/voucher-list-controls";
import {
  getReceiptVouchers,
  createReceiptVoucher,
  cancelVoucher,
  getNextVoucherNumber,
  getPendingSales,
  getAccountingSummary,
} from "@/api/accounting-api";
import VoucherPrintModal from "../shared/voucher-print-modal";

const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const money = (v) => roundMoney(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const resolveAdvanceStatus = (adv, voucherStatus) => {
  if (voucherStatus === "CANCELLED" || adv?.status === "CANCELLED") {
    return {
      label: "Cancelled",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: Ban,
    };
  }
  const total = Number(adv?.amount || 0);
  const adjusted = Number(adv?.adjustedAmount || 0);
  const balance = Number(adv?.balanceAmount ?? Math.max(0, total - adjusted));

  if (balance <= 0.01 || adv?.status === "FULLY_ADJUSTED") {
    return {
      label: "Fully Used",
      cls: "bg-slate-100 text-slate-700 border-slate-200",
      icon: CheckCircle2,
    };
  }
  if (adjusted > 0.01 || adv?.status === "PARTIALLY_ADJUSTED") {
    return {
      label: "Partially Used",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    };
  }
  return {
    label: "Available",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
  };
};

export default function ReceiptPage() {
  const [summary, setSummary] = useState(null);

  // Filters
  const [refFilter, setRefFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [modeFilter, setModeFilter] = useState("ALL");

  const {
    vouchers,
    pagination,
    loading,
    search,
    setSearch,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    goToPage,
    reload,
  } = useVoucherList(getReceiptVouchers, {
    referenceType: refFilter,
    status: statusFilter,
    paymentMode: modeFilter,
  });

  // Print Modal
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Advance Details Modal
  const [advanceDetailsOpen, setAdvanceDetailsOpen] = useState(false);
  const [selectedAdvanceVoucher, setSelectedAdvanceVoucher] = useState(null);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // New Voucher Form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nextVoucherNo, setNextVoucherNo] = useState("");

  const [formData, setFormData] = useState({
    referenceType: "SALE_INVOICE",
    date: localToday(),
    receivedFrom: "",
    partyPhone: "",
    customerId: null,
    saleId: null,
    selectedSale: null,
    amount: "",
    paymentMode: "CASH",
    bankName: "",
    transactionRef: "",
    narration: "",
  });

  // Customer search & pending sales
  const [searchPhone, setSearchPhone] = useState("");
  const [customerSales, setCustomerSales] = useState([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // KPI summary loads once and after a change, not on every filter keystroke.
  const loadSummary = useCallback(
    () =>
      getAccountingSummary()
        .then((sum) => sum && setSummary(sum))
        .catch(() => {}),
    []
  );

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const loadData = () => {
    reload();
    loadSummary();
  };

  const [searchParams, setSearchParams] = useSearchParams();

  // Open Create Form
  const handleOpenCreate = useCallback(async (defaultType = "SALE_INVOICE") => {
    try {
      const nextNo = await getNextVoucherNumber("RECEIPT");
      setNextVoucherNo(nextNo || "RV-000001");
    } catch {
      setNextVoucherNo("RV-000001");
    }
    setFormData({
      referenceType: defaultType,
      date: localToday(),
      receivedFrom: "",
      partyPhone: "",
      customerId: null,
      saleId: null,
      selectedSale: null,
      amount: "",
      paymentMode: "CASH",
      bankName: "",
      transactionRef: "",
      narration: "",
    });
    setSearchPhone("");
    setCustomerSales([]);
    setFormOpen(true);
  }, []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "ADVANCE") {
      setRefFilter("ADVANCE");
    }
    const type = searchParams.get("type");
    if (type === "ADVANCE") {
      setRefFilter("ADVANCE");
      handleOpenCreate("ADVANCE");
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, handleOpenCreate, setSearchParams]);

  // Search pending sales when phone or customerId changes
  const handleSearchCustomerDues = async () => {
    if (!searchPhone.trim()) {
      notifyError(null, "Please enter a customer phone number or ID.");
      return;
    }
    setLoadingSales(true);
    try {
      const sales = await getPendingSales({ phone: searchPhone.trim() });
      setCustomerSales(sales);
      if (sales.length > 0) {
        setFormData((prev) => ({
          ...prev,
          receivedFrom: sales[0].customerName || prev.receivedFrom,
          partyPhone: sales[0].customerPhone || searchPhone.trim(),
        }));
        notifySuccess(`Found ${sales.length} pending sale invoice(s) for customer.`);
      } else {
        notifyError(null, "No pending dues found for this phone number.");
      }
    } catch (err) {
      notifyError(err, "Failed to fetch pending sales.");
    } finally {
      setLoadingSales(false);
    }
  };

  const handleSelectSale = (sale) => {
    setFormData((prev) => ({
      ...prev,
      saleId: sale.id,
      selectedSale: sale,
      amount: sale.dueAmount,
      receivedFrom: sale.customerName || prev.receivedFrom,
      partyPhone: sale.customerPhone || prev.partyPhone,
      narration: `Payment for Sale Invoice ${sale.invoiceNo}`,
    }));
  };

  const handleSubmitVoucher = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      notifyError(null, "Please enter a valid receipt amount greater than 0.");
      return;
    }

    if (formData.referenceType === "SALE_INVOICE") {
      if (!formData.saleId || !formData.selectedSale) {
        notifyError(null, "Please select a pending sale invoice.");
        return;
      }
      if (Number(formData.amount) > Number(formData.selectedSale.dueAmount) + 0.01) {
        notifyError(
          null,
          `Amount cannot exceed the pending due of ₹${money(formData.selectedSale.dueAmount)}.`
        );
        return;
      }
    } else if (formData.referenceType === "ADVANCE") {
      if (!formData.receivedFrom?.trim()) {
        notifyError(null, "Customer name is required for advance receipt.");
        return;
      }
    } else {
      if (!formData.receivedFrom?.trim()) {
        notifyError(null, "Received From name is required.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { selectedSale: _sale, ...rest } = formData;
      const res = await createReceiptVoucher({
        ...rest,
        // a hidden bank name must not be saved on a cash receipt (ACC-21)
        bankName: formData.paymentMode === "CASH" ? "" : formData.bankName,
      });
      notifySuccess(res.message || "Receipt Voucher created successfully!");
      setFormOpen(false);
      loadData();
      if (res.data) {
        setSelectedVoucher(res.data);
        setPrintOpen(true);
      }
    } catch (err) {
      notifyError(err, "Failed to create receipt voucher.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!voucherToCancel) return;
    if (!cancelReason.trim()) {
      notifyError(null, "Please enter a reason for cancelling this voucher.");
      return;
    }
    setCancelling(true);
    try {
      await cancelVoucher(voucherToCancel.id, cancelReason.trim());
      notifySuccess(`Voucher ${voucherToCancel.voucherNo} cancelled and reversed successfully!`);
      setCancelModalOpen(false);
      setVoucherToCancel(null);
      setCancelReason("");
      loadData();
    } catch (err) {
      notifyError(err, "Failed to cancel voucher.");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Receipt Voucher</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
              Money Received
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Collect pending sale dues, record customer advance payments, and handle incoming cash/bank receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={loadData}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs text-slate-600"
          >
            <RotateCcw size={14} />
            <span>Refresh</span>
          </Button>
         
          <Button
            onClick={() => handleOpenCreate("SALE_INVOICE")}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold text-xs"
          >
            <Plus size={16} />
            <span>New Receipt Voucher</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ArrowDownLeft size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Today's Receipts</div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(summary?.todayReceipts || 0)}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium">Cash & Bank Inflow</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">This Month's Receipts</div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(summary?.monthReceipts || 0)}
            </div>
            <div className="text-[11px] text-blue-600 font-medium">Cumulative month total</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Wallet size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Pending Customer Due</div>
            <div className="text-xl font-bold text-amber-700 truncate">
              ₹{money(summary?.totalCustomerDue || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Across {summary?.pendingSalesCount || 0} pending sale(s)
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center shrink-0">
            <CreditCard size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Available Customer Advances</div>
            <div className="text-xl font-bold text-teal-800 truncate">
              ₹{money(summary?.totalAvailableAdvance || 0)}
            </div>
            <div className="text-[11px] text-teal-600 font-medium">
              {summary?.totalAvailableAdvancesCount || 0} active unused advance(s)
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs & Quick Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60">
          <button
            type="button"
            onClick={() => setRefFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              refFilter === "ALL"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
            }`}
          >
            All Receipts
          </button>
          <button
            type="button"
            onClick={() => setRefFilter("ADVANCE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
              refFilter === "ADVANCE"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-blue-700 hover:bg-blue-50"
            }`}
          >
            <span>Customer Advances</span>
            {Number(summary?.totalAvailableAdvance || 0) > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  refFilter === "ADVANCE"
                    ? "bg-white text-blue-700"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                ₹{money(summary.totalAvailableAdvance)}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setRefFilter("SALE_INVOICE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              refFilter === "SALE_INVOICE"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-700 hover:bg-purple-50"
            }`}
          >
            Sale Due Receipts
          </button>
          <button
            type="button"
            onClick={() => setRefFilter("OTHER")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              refFilter === "OTHER"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:bg-white/50"
            }`}
          >
            Other Receipts
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Showing <strong>{vouchers.length}</strong> of <strong>{pagination.total}</strong> voucher(s)
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <DateRangeFilter
            startDate={startDate}
            endDate={endDate}
            onStartDate={setStartDate}
            onEndDate={setEndDate}
          />
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search voucher, customer, phone, ref doc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / QR Code</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          {refFilter === "ADVANCE" ? (
            /* =========================================================
               DEDICATED CUSTOMER ADVANCES TABLE VIEW
            ========================================================= */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Voucher & ADV Ref</th>
                  <th className="p-3.5">Receive Date</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5 text-right">Total Advance (₹)</th>
                  <th className="p-3.5 text-right">Adjusted in Sales (₹)</th>
                  <th className="p-3.5 text-right">Available Balance (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-500">
                      Loading customer advances...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400">
                      No customer advance vouchers found. Click "+ Record Advance" to create one.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => {
                    const isCancelled = v.status === "CANCELLED";
                    const adv = v.advanceReceive;
                    const total = Number(adv?.amount || v.amount || 0);
                    const adjusted = Number(adv?.adjustedAmount || 0);
                    const balance = isCancelled
                      ? 0
                      : Number(adv?.balanceAmount ?? Math.max(0, total - adjusted));
                    const advStatusCfg = resolveAdvanceStatus(adv, v.status);
                    const StatusIcon = advStatusCfg.icon;
                    const hasAdjustments = (adv?.saleAdjustments?.length || 0) > 0 || adjusted > 0.01;

                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isCancelled ? "bg-red-50/20 text-slate-400" : ""
                        }`}
                      >
                        <td className="p-3.5 font-mono">
                          <button
                            onClick={() => {
                              setSelectedVoucher(v);
                              setPrintOpen(true);
                            }}
                            className="font-bold text-slate-900 hover:text-emerald-600 underline cursor-pointer text-left block"
                          >
                            {v.voucherNo}
                          </button>
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
                            ADV-{v.referenceId}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {v.date ? new Date(v.date).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{v.partyName || "Customer"}</div>
                          {v.partyPhone && (
                            <div className="text-[11px] text-slate-400">{v.partyPhone}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700 uppercase">
                            {v.paymentMode === "CASH" ? "Cash" : v.paymentMode}
                            {v.bankName ? ` (${v.bankName})` : ""}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          ₹{money(total)}
                        </td>
                        <td className="p-3.5 text-right font-mono">
                          {adjusted > 0 ? (
                            <div>
                              <span className="font-bold text-purple-700">₹{money(adjusted)}</span>
                              {hasAdjustments && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAdvanceVoucher(v);
                                    setAdvanceDetailsOpen(true);
                                  }}
                                  className="text-[10px] text-blue-600 underline block ml-auto hover:text-blue-800 font-medium"
                                  title="View sale invoice adjustment breakdown"
                                >
                                  View ({adv?.saleAdjustments?.length || 1})
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-sm">
                          <span className={balance > 0 ? "text-emerald-700" : "text-slate-400"}>
                            ₹{money(balance)}
                          </span>
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${advStatusCfg.cls}`}
                          >
                            <StatusIcon size={12} />
                            <span>{advStatusCfg.label}</span>
                          </span>
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {hasAdjustments && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAdvanceVoucher(v);
                                  setAdvanceDetailsOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                                title="View Sale Invoices where this advance was used"
                              >
                                <Eye size={15} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedVoucher(v);
                                setPrintOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-700"
                              title="Print / View Voucher Slip"
                            >
                              <Printer size={15} />
                            </Button>
                            {!isCancelled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={adjusted > 0.01}
                                onClick={() => {
                                  setVoucherToCancel(v);
                                  setCancelReason("");
                                  setCancelModalOpen(true);
                                }}
                                className={`h-7 w-7 p-0 ${
                                  adjusted > 0.01
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-400 hover:text-red-600"
                                }`}
                                title={
                                  adjusted > 0.01
                                    ? `Cannot cancel: advance has been adjusted (₹${money(adjusted)}) in sales`
                                    : "Cancel Voucher"
                                }
                              >
                                <Ban size={15} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            /* =========================================================
               STANDARD ALL / SALE / OTHER RECEIPTS TABLE VIEW
            ========================================================= */
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b text-slate-600 uppercase font-semibold">
                <tr>
                  <th className="p-3.5">Voucher No</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5">Received From</th>
                  <th className="p-3.5">Reference</th>
                  <th className="p-3.5">Payment Mode</th>
                  <th className="p-3.5 text-right">Amount (₹)</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-500">
                      Loading vouchers...
                    </td>
                  </tr>
                ) : vouchers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No receipt vouchers found. Click "+ New Receipt Voucher" to record a payment.
                    </td>
                  </tr>
                ) : (
                  vouchers.map((v) => {
                    const isCancelled = v.status === "CANCELLED";
                    const isAdvance = v.referenceType === "ADVANCE";
                    const adv = v.advanceReceive;
                    const advStatusCfg = isAdvance ? resolveAdvanceStatus(adv, v.status) : null;
                    const StatusIcon = advStatusCfg?.icon;
                    const hasAdjustments = (adv?.saleAdjustments?.length || 0) > 0 || (Number(adv?.adjustedAmount || 0) > 0.01);

                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-slate-50/60 transition-colors ${
                          isCancelled ? "bg-red-50/20 text-slate-400" : ""
                        }`}
                      >
                        <td className="p-3.5 font-mono font-bold text-slate-900">
                          <button
                            onClick={() => {
                              setSelectedVoucher(v);
                              setPrintOpen(true);
                            }}
                            className="hover:text-emerald-600 underline cursor-pointer text-left"
                          >
                            {v.voucherNo}
                          </button>
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {v.date ? new Date(v.date).toLocaleDateString("en-IN") : "-"}
                        </td>
                        <td className="p-3.5">
                          <div className="font-semibold text-slate-900">{v.partyName || "Party"}</div>
                          {v.partyPhone && (
                            <div className="text-[11px] text-slate-400">{v.partyPhone}</div>
                          )}
                        </td>
                        <td className="p-3.5">
                          {isAdvance ? (
                            <div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-700">
                                Advance: {v.referenceDocNo || `ADV-${v.referenceId}`}
                              </span>
                              {adv && (
                                <div className="text-[10px] text-slate-500 mt-0.5">
                                  Bal: <strong className="text-emerald-700">₹{money(adv.balanceAmount)}</strong>
                                  {Number(adv.adjustedAmount || 0) > 0 && (
                                    <span> | Used: ₹{money(adv.adjustedAmount)}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                v.referenceType === "SALE_INVOICE"
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {v.referenceType === "SALE_INVOICE"
                                ? `Sale: ${v.referenceDocNo || `#${v.referenceId}`}`
                                : "Other Receipt"}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            {v.paymentMode === "CASH" ? "Cash" : v.paymentMode}
                            {v.bankName ? ` (${v.bankName})` : ""}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                          ₹{money(v.amount)}
                        </td>
                        <td className="p-3.5 text-center">
                          {isAdvance && advStatusCfg ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${advStatusCfg.cls}`}
                            >
                              <StatusIcon size={11} />
                              <span>{advStatusCfg.label}</span>
                            </span>
                          ) : (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCancelled
                                  ? "bg-red-100 text-red-700"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {v.status}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isAdvance && hasAdjustments && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setSelectedAdvanceVoucher(v);
                                  setAdvanceDetailsOpen(true);
                                }}
                                className="h-7 w-7 p-0 text-blue-600 hover:text-blue-800"
                                title="View adjustments in sales"
                              >
                                <Eye size={15} />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedVoucher(v);
                                setPrintOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-600 hover:text-emerald-700"
                              title="Print / View Voucher Slip"
                            >
                              <Printer size={15} />
                            </Button>
                            {!isCancelled && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={isAdvance && Number(adv?.adjustedAmount || 0) > 0.01}
                                onClick={() => {
                                  setVoucherToCancel(v);
                                  setCancelReason("");
                                  setCancelModalOpen(true);
                                }}
                                className={`h-7 w-7 p-0 ${
                                  isAdvance && Number(adv?.adjustedAmount || 0) > 0.01
                                    ? "text-slate-300 cursor-not-allowed"
                                    : "text-slate-400 hover:text-red-600"
                                }`}
                                title={
                                  isAdvance && Number(adv?.adjustedAmount || 0) > 0.01
                                    ? `Cannot cancel: advance has already been adjusted (₹${money(adv.adjustedAmount)})`
                                    : "Cancel Voucher"
                                }
                              >
                                <Ban size={15} />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
        <VoucherPager pagination={pagination} shown={vouchers.length} loading={loading} onPage={goToPage} />
      </div>

      {/* =========================================================
          NEW RECEIPT VOUCHER DIALOG
      ========================================================= */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="!w-[95vw] !max-w-[850px] p-0 max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  New Receipt Voucher
                </DialogTitle>
                <div className="text-xs text-slate-500 mt-0.5">
                  Record incoming payment and update customer due balance automatically.
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher No</span>
                <span className="font-mono text-sm font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {nextVoucherNo}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
            {/* 1. Reference Type Pills */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Receipt Type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "SALE_INVOICE", label: "Sale Invoice Due", desc: "Customer pays pending due on a sale" },
                  { id: "ADVANCE", label: "Customer Advance", desc: "Advance money before purchasing" },
                  { id: "OTHER", label: "Other Receipts", desc: "Scrap sale, interest, general income" },
                ].map((type) => {
                  const active = formData.referenceType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          referenceType: type.id,
                          saleId: null,
                          selectedSale: null,
                          customerId: null,
                          amount: "",
                        }))
                      }
                      className={`p-3 rounded-lg border text-left transition-all ${
                        active
                          ? "border-emerald-600 bg-emerald-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`font-bold ${active ? "text-emerald-900" : "text-slate-800"}`}>
                        {type.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{type.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Type-specific Section */}
            {formData.referenceType === "SALE_INVOICE" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="font-semibold text-slate-900 flex items-center justify-between">
                  <span>Customer Pending Sale Invoices</span>
                  <span className="text-[11px] text-slate-500">Search customer by 10-digit mobile number</span>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Enter customer phone number..."
                      value={searchPhone}
                      onChange={(e) => setSearchPhone(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearchCustomerDues()}
                      className="pl-9 text-xs"
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSearchCustomerDues}
                    disabled={loadingSales}
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-1.5"
                  >
                    <Search size={14} />
                    <span>{loadingSales ? "Searching..." : "Find Dues"}</span>
                  </Button>
                </div>

                {/* Pending Invoices List */}
                {customerSales.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="text-[11px] font-medium text-slate-600">
                      Select an invoice to settle pending due:
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1.5">
                      {customerSales.map((sale) => {
                        const isSelected = formData.saleId === sale.id;
                        return (
                          <div
                            key={sale.id}
                            onClick={() => handleSelectSale(sale)}
                            className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? "bg-emerald-50 border-emerald-500 shadow-xs"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span className="font-mono text-emerald-800">{sale.invoiceNo}</span>
                                <span className="text-[10px] text-slate-400 font-normal">
                                  ({new Date(sale.saleDate).toLocaleDateString("en-IN")})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500">
                                Customer: <span className="font-medium text-slate-800">{sale.customerName}</span> | Ph: {sale.customerPhone}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-[11px] text-slate-400">
                                Net: ₹{money(sale.netPayable)} | Paid: ₹{money(sale.paidAmount)}
                              </div>
                              <div className="font-mono font-bold text-amber-700 text-sm">
                                Due: ₹{money(sale.dueAmount)}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {formData.selectedSale && (
                  <div className="bg-emerald-100/60 border border-emerald-300 p-2.5 rounded-lg flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-emerald-900">Selected Invoice: </span>
                      <span className="font-mono font-bold text-emerald-800">{formData.selectedSale.invoiceNo}</span>
                      <span className="text-emerald-700 ml-2">
                        (Pending Due: ₹{money(formData.selectedSale.dueAmount)})
                      </span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        setFormData((prev) => ({
                          ...prev,
                          amount: formData.selectedSale.dueAmount,
                        }))
                      }
                      className="h-6 text-[11px] bg-white text-emerald-800 border-emerald-400"
                    >
                      Pay Full Due
                    </Button>
                  </div>
                )}
              </div>
            )}

            {formData.referenceType === "ADVANCE" && (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-blue-800 font-bold">
                  <AlertCircle size={16} />
                  <span>Customer Advance Information</span>
                </div>
                <p className="text-[11px] text-blue-700">
                  This advance will be recorded in Customer Advances and immediately available for adjustment in the Sales billing screen when this customer purchases jewellery.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Customer Name *</label>
                    <Input
                      placeholder="Customer name..."
                      value={formData.receivedFrom}
                      onChange={(e) => setFormData((p) => ({ ...p, receivedFrom: e.target.value }))}
                      className="text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">Mobile Number</label>
                    <Input
                      placeholder="10-digit mobile number..."
                      value={formData.partyPhone}
                      onChange={(e) => setFormData((p) => ({ ...p, partyPhone: e.target.value }))}
                      className="text-xs bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            {formData.referenceType === "OTHER" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Received From *</label>
                  <Input
                    placeholder="Person or party name..."
                    value={formData.receivedFrom}
                    onChange={(e) => setFormData((p) => ({ ...p, receivedFrom: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone / Contact</label>
                  <Input
                    placeholder="Contact number..."
                    value={formData.partyPhone}
                    onChange={(e) => setFormData((p) => ({ ...p, partyPhone: e.target.value }))}
                    className="text-xs"
                  />
                </div>
              </div>
            )}

            {/* 3. Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Date *</label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                  className="text-xs"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Amount Received (₹) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="text-xs font-mono font-bold text-emerald-800"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Mode *</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      paymentMode: e.target.value,
                      bankName: e.target.value === "CASH" ? "" : p.bankName,
                    }))
                  }
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
                >
                  <option value="CASH">Cash Drawer</option>
                  <option value="UPI">UPI / QR Code</option>
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {formData.paymentMode !== "CASH" && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank / Channel Name</label>
                  <Input
                    placeholder="e.g. HDFC Bank, PhonePe, SBI..."
                    value={formData.bankName}
                    onChange={(e) => setFormData((p) => ({ ...p, bankName: e.target.value }))}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Transaction Ref / UTR / Cheque No</label>
                  <Input
                    placeholder="Reference / Cheque number..."
                    value={formData.transactionRef}
                    onChange={(e) => setFormData((p) => ({ ...p, transactionRef: e.target.value }))}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* 4. Narration */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Narration / Notes</label>
              <Textarea
                placeholder="Optional notes or remarks..."
                rows={2}
                value={formData.narration}
                onChange={(e) => setFormData((p) => ({ ...p, narration: e.target.value }))}
                className="text-xs"
              />
            </div>

            {/* 5. Live Double-Entry Preview */}
            <div className="bg-linear-to-r from-slate-900  via-blue-800 to-slate-900 text-white p-3 rounded-lg text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wide">
                Automatic Accounting Entry (Real-time preview)
              </div>
              <div className="font-mono flex justify-between">
                <span className="text-emerald-400">
                  {formData.paymentMode === "CASH" ? "Cash in Hand A/C" : "Bank / UPI A/C"}
                </span>
                <span className="font-bold">₹{money(formData.amount || 0)}</span>
              </div>
              <div className="font-mono flex justify-between pl-4">
                <span className="text-blue-300">
                  To {formData.referenceType === "SALE_INVOICE"
                    ? `Customer A/C (${formData.receivedFrom || "Party"})`
                    : formData.referenceType === "ADVANCE"
                    ? `Customer Advance A/C (${formData.receivedFrom || "Party"})`
                    : "Other Income / Party A/C"}
                </span>
                <span className="font-bold">₹{money(formData.amount || 0)}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitVoucher}
              disabled={submitting}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {submitting ? "Saving Voucher..." : "Save & Generate Voucher"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          ADVANCE ADJUSTMENT DETAILS DIALOG
      ========================================================= */}
      <Dialog open={advanceDetailsOpen} onOpenChange={setAdvanceDetailsOpen}>
        <DialogContent className="!w-[90vw] !max-w-[700px] p-0 max-h-[85vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              <span>Customer Advance Usage Details</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-6 overflow-y-auto space-y-4 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher / Ref</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedAdvanceVoucher?.voucherNo} (ADV-{selectedAdvanceVoucher?.referenceId})
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer</span>
                <span className="font-semibold text-slate-900">
                  {selectedAdvanceVoucher?.partyName}
                </span>
                {selectedAdvanceVoucher?.partyPhone && (
                  <div className="text-[11px] text-slate-500">{selectedAdvanceVoucher.partyPhone}</div>
                )}
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Advance</span>
                <span className="font-bold text-slate-900 text-sm">
                  ₹{money(selectedAdvanceVoucher?.amount)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Available Balance</span>
                <span className="font-bold text-emerald-700 text-sm">
                  ₹{money(selectedAdvanceVoucher?.advanceReceive?.balanceAmount)}
                </span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2">Adjustments in Sales Invoices</h4>
              {!selectedAdvanceVoucher?.advanceReceive?.saleAdjustments?.length ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg border border-dashed">
                  This advance has not been adjusted in any sales invoice yet. Full amount is available.
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b font-semibold text-slate-600">
                      <tr>
                        <th className="p-2.5">Invoice No</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5 text-right">Net Payable</th>
                        <th className="p-2.5 text-right">Adjusted Amount</th>
                        <th className="p-2.5 text-right">Remaining Bal</th>
                        <th className="p-2.5">Cashier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedAdvanceVoucher.advanceReceive.saleAdjustments.map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50/60">
                          <td className="p-2.5 font-mono font-bold text-blue-700">
                            {adj.sale?.invoiceNo || `#${adj.saleId}`}
                          </td>
                          <td className="p-2.5 text-slate-600">
                            {adj.sale?.saleDate
                              ? new Date(adj.sale.saleDate).toLocaleDateString("en-IN")
                              : "-"}
                          </td>
                          <td className="p-2.5 text-right font-mono">
                            ₹{money(adj.sale?.netPayable)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-bold text-purple-700">
                            ₹{money(adj.amount || adj.adjustedAmount)}
                          </td>
                          <td className="p-2.5 text-right font-mono font-semibold text-slate-700">
                            ₹{money(adj.remainingBalance)}
                          </td>
                          <td className="p-2.5 text-slate-500">
                            {adj.cashierName || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-4 border-t bg-slate-50">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAdvanceDetailsOpen(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          CANCEL VOUCHER DIALOG
      ========================================================= */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle size={18} />
              <span>Cancel Receipt Voucher</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-700 py-2">
            <p>
              Are you sure you want to cancel voucher{" "}
              <span className="font-mono font-bold text-slate-900">{voucherToCancel?.voucherNo}</span> (₹{money(voucherToCancel?.amount)})?
            </p>

            {voucherToCancel?.referenceType === "ADVANCE" ? (
              Number(voucherToCancel?.advanceReceive?.adjustedAmount || 0) > 0.01 ? (
                <div className="bg-red-50 border border-red-200 p-2.5 rounded text-red-800">
                  <span className="font-bold">Cancellation Prohibited: </span>
                  This advance has already been adjusted (₹{money(voucherToCancel.advanceReceive.adjustedAmount)}) in sales invoices. You cannot cancel an advance that has already been utilized.
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-800">
                  <span className="font-bold">Safety Reversal: </span>
                  This advance record will be marked as <strong>CANCELLED</strong> and will no longer be available for customer sale deductions.
                </div>
              )
            ) : voucherToCancel?.referenceType === "SALE_INVOICE" ? (
              <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-800">
                <span className="font-bold">Safety Reversal: </span>
                The pending due amount on Sale Invoice {voucherToCancel.referenceDocNo || `#${voucherToCancel.referenceId}`} will be safely restored and the payment record will be removed.
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded text-slate-800">
                <span className="font-bold">Safety Reversal: </span>
                The ledger accounting entries for this receipt will be reversed.
              </div>
            )}

            <div>
              <label className="font-semibold block mb-1">
                Cancellation Reason <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Bounced cheque, customer request, entry mistake..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelModalOpen(false)}>
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelConfirm}
              disabled={
                cancelling ||
                !cancelReason.trim() ||
                (voucherToCancel?.referenceType === "ADVANCE" &&
                  Number(voucherToCancel?.advanceReceive?.adjustedAmount || 0) > 0.01)
              }
            >
              {cancelling ? "Cancelling..." : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Slip Modal */}
      <VoucherPrintModal
        open={printOpen}
        setOpen={setPrintOpen}
        voucher={selectedVoucher}
      />
    </div>
  );
}