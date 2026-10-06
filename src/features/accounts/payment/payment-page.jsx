import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Printer,
  Ban,
  ArrowUpRight,
  Calendar,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Building,
  User,
  Phone,
  FileText,
  DollarSign,
  TrendingDown,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  getPaymentVouchers,
  createPaymentVoucher,
  cancelVoucher,
  getNextVoucherNumber,
  getPendingPurchases,
  getPendingSuppliers,
  getAccountingSummary,
} from "@/api/accounting-api";
import VoucherPrintModal from "../shared/voucher-print-modal";

const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const money = (v) => roundMoney(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const EXPENSE_TYPES = [
  { id: "PURCHASE", label: "Supplier Purchase", desc: "Pay pending purchase invoice to bullion/jewellery supplier" },
  { id: "SALARY", label: "Salary Payment", desc: "Employee / staff wages & salary" },
  { id: "RENT", label: "Shop Rent", desc: "Showroom / office monthly rent" },
  { id: "ELECTRICITY", label: "Electricity Bill", desc: "Power & utility electricity expenses" },
  { id: "TRANSPORT", label: "Transport & Courier", desc: "Logistics, courier, and travel expenses" },
  { id: "EXPENSE", label: "Other Expenses", desc: "Tea, refreshments, maintenance, office stationery" },
];

export default function PaymentPage() {
  const [summary, setSummary] = useState(null);

  // Supplier Purchase specific state
  const [pendingSuppliers, setPendingSuppliers] = useState([]);
  const [phoneQuery, setPhoneQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [supplierTotalDue, setSupplierTotalDue] = useState(0);
  const [showPhoneSuggestions, setShowPhoneSuggestions] = useState(false);

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
  } = useVoucherList(getPaymentVouchers, {
    referenceType: refFilter,
    status: statusFilter,
    paymentMode: modeFilter,
  });

  // Print Modal
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // New Payment Form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nextVoucherNo, setNextVoucherNo] = useState("");

  const [formData, setFormData] = useState({
    referenceType: "PURCHASE",
    date: localToday(),
    payTo: "",
    partyPhone: "",
    partyId: null,
    purchaseId: null,
    selectedPurchase: null,
    amount: "",
    paymentMode: "BANK_TRANSFER",
    bankName: "HDFC Bank",
    transactionRef: "",
    narration: "",
  });

  // Supplier pending purchases
  const [pendingPurchases, setPendingPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(false);

  // Summary and pending suppliers load once (and after a change), not per keystroke.
  const loadSideData = useCallback(
    () =>
      Promise.all([
        getAccountingSummary().catch(() => null),
        getPendingSuppliers().catch(() => []),
      ]).then(([sum, pendSuppliersRes]) => {
        if (sum) setSummary(sum);
        setPendingSuppliers(Array.isArray(pendSuppliersRes) ? pendSuppliersRes : []);
      }),
    []
  );

  useEffect(() => {
    loadSideData();
  }, [loadSideData]);

  const loadData = () => {
    reload();
    loadSideData();
  };

  // Open Create Form
  const handleOpenCreate = async () => {
    try {
      const [nextNo, pendSuppliers] = await Promise.all([
        getNextVoucherNumber("PAYMENT").catch(() => "PV-000001"),
        getPendingSuppliers().catch(() => []),
      ]);
      setNextVoucherNo(nextNo || "PV-000001");
      setPendingSuppliers(pendSuppliers);
    } catch {
      setNextVoucherNo("PV-000001");
    }

    setPhoneQuery("");
    setSelectedSupplier(null);
    setSupplierTotalDue(0);
    setShowPhoneSuggestions(false);
    setPendingPurchases([]);

    setFormData({
      referenceType: "PURCHASE",
      date: localToday(),
      payTo: "",
      partyPhone: "",
      partyId: null,
      purchaseId: null,
      selectedPurchase: null,
      amount: "",
      paymentMode: "BANK_TRANSFER",
      bankName: "HDFC Bank",
      transactionRef: "",
      narration: "",
    });
    setFormOpen(true);
  };

  // Supplier selection by Phone Number -> fetch supplier & pending purchases
  const handleSelectSupplierByPhone = async (supplierOrPhone) => {
    const phone = typeof supplierOrPhone === "string" ? supplierOrPhone.trim() : (supplierOrPhone.phone || "").trim();
    const partyId = typeof supplierOrPhone === "object" ? supplierOrPhone.partyId : null;

    if (!phone && !partyId) return;

    setLoadingPurchases(true);
    setShowPhoneSuggestions(false);
    try {
      const res = await getPendingPurchases({ phone, partyId });
      const purchasesList = Array.isArray(res.data) ? res.data : [];
      const supp = res.supplier || (typeof supplierOrPhone === "object" ? supplierOrPhone : null);
      const totalDue = Number(res.totalOutstandingDue ?? (typeof supplierOrPhone === "object" ? supplierOrPhone.totalDueAmount : 0));

      setSelectedSupplier(supp);
      setSupplierTotalDue(totalDue);
      setPendingPurchases(purchasesList);
      setPhoneQuery(phone || supp?.phone || "");

      const autoPurchase = purchasesList.length === 1 ? purchasesList[0] : null;

      setFormData((prev) => ({
        ...prev,
        partyId: supp?.id || supp?.partyId || partyId || null,
        payTo: supp?.name || "Supplier",
        partyPhone: phone || supp?.phone || "",
        purchaseId: autoPurchase?.id || null,
        selectedPurchase: autoPurchase,
        amount: autoPurchase ? autoPurchase.dueAmount : (totalDue > 0 ? totalDue : ""),
        narration: autoPurchase ? `Payment against Purchase Invoice ${autoPurchase.invoiceNo || `#${autoPurchase.id}`}` : "",
      }));

      if (purchasesList.length === 0) {
        notifyError(null, "No pending purchase invoices with due amount found for this supplier.");
      }
    } catch (err) {
      notifyError(err, "Failed to fetch supplier pending purchases.");
    } finally {
      setLoadingPurchases(false);
    }
  };

  const handleClearSupplier = () => {
    setPhoneQuery("");
    setSelectedSupplier(null);
    setSupplierTotalDue(0);
    setPendingPurchases([]);
    setFormData((prev) => ({
      ...prev,
      partyId: null,
      partyPhone: "",
      payTo: "",
      purchaseId: null,
      selectedPurchase: null,
      amount: "",
      narration: "",
    }));
  };

  const handleSelectPurchase = (pur) => {
    setFormData((prev) => ({
      ...prev,
      purchaseId: pur.id,
      selectedPurchase: pur,
      amount: pur.dueAmount,
      narration: `Payment against Purchase Invoice ${pur.invoiceNo || `#${pur.id}`}`,
    }));
  };

  const handleSubmitVoucher = async () => {
    if (!formData.amount || Number(formData.amount) <= 0) {
      notifyError(null, "Please enter a valid payment amount greater than 0.");
      return;
    }

    if (formData.referenceType === "PURCHASE") {
      if (!selectedSupplier && !formData.partyPhone && !formData.partyId) {
        notifyError(null, "Please search and select a supplier with outstanding purchase dues.");
        return;
      }
      if (pendingPurchases.length === 0) {
        notifyError(null, "No pending purchase invoices found for this supplier.");
        return;
      }
      const maxDue = formData.selectedPurchase
        ? Number(formData.selectedPurchase.dueAmount)
        : Number(supplierTotalDue);

      if (Number(formData.amount) > maxDue + 0.01) {
        notifyError(
          null,
          `Payment amount cannot exceed the pending due of ₹${money(maxDue)}.`
        );
        return;
      }
    } else {
      if (!formData.payTo?.trim()) {
        notifyError(null, "Pay To / Party Name is required.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const { selectedPurchase: _purchase, ...rest } = formData;
      const isPurchase = formData.referenceType === "PURCHASE";
      const res = await createPaymentVoucher({
        ...rest,
        // supplier fields only belong to supplier payments; hidden bank name not saved for cash (ACC-21)
        partyId: isPurchase ? formData.partyId : null,
        purchaseId: isPurchase ? formData.purchaseId : null,
        bankName: formData.paymentMode === "CASH" ? "" : formData.bankName,
      });
      notifySuccess(res.message || "Payment Voucher created successfully!");
      setFormOpen(false);
      loadData();
      if (res.data) {
        setSelectedVoucher(res.data);
        setPrintOpen(true);
      }
    } catch (err) {
      notifyError(err, "Failed to create payment voucher.");
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payment Voucher</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              Money Paid
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Settle supplier purchase invoices, and record salary, rent, electricity, transport, and operational expenses.
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
          <Button
            onClick={handleOpenCreate}
            className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm font-semibold"
          >
            <Plus size={16} />
            <span>New Payment Voucher</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <ArrowUpRight size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Today's Payments</div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(summary?.todayPayments || 0)}
            </div>
            <div className="text-[11px] text-rose-600 font-medium">Outflow recorded today</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Calendar size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">This Month's Payments</div>
            <div className="text-xl font-bold text-slate-900 truncate">
              ₹{money(summary?.monthPayments || 0)}
            </div>
            <div className="text-[11px] text-blue-600 font-medium">Cumulative month total</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <TrendingDown size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Supplier Outstanding Dues</div>
            <div className="text-xl font-bold text-amber-700 truncate">
              ₹{money(summary?.totalSupplierDue || 0)}
            </div>
            <div className="text-[11px] text-slate-500">
              Across {summary?.pendingPurchasesCount || 0} purchase invoice(s)
            </div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Total Vouchers</div>
            <div className="text-xl font-bold text-slate-900">{pagination.total}</div>
            <div className="text-[11px] text-slate-500">Matching the filters</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-4 shadow-xs space-y-3">
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDate={setStartDate}
          onEndDate={setEndDate}
        />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search voucher, payee, phone, ref doc..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div>
            <select
              value={refFilter}
              onChange={(e) => setRefFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="ALL">All Payment Types</option>
              <option value="PURCHASE">Supplier Purchase</option>
              <option value="SALARY">Salary Payment</option>
              <option value="RENT">Shop Rent</option>
              <option value="ELECTRICITY">Electricity Bill</option>
              <option value="TRANSPORT">Transport</option>
              <option value="EXPENSE">Other Expenses</option>
            </select>
          </div>

          <div>
            <select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-xs"
            >
              <option value="ALL">All Payment Modes</option>
              <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
              <option value="UPI">UPI / Online</option>
              <option value="CASH">Cash Drawer</option>
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
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3.5">Voucher No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Paid To / Payee</th>
                <th className="p-3.5">Reference Type</th>
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
                    Loading payment vouchers...
                  </td>
                </tr>
              ) : vouchers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No payment vouchers found. Click "+ New Payment Voucher" to make a payment.
                  </td>
                </tr>
              ) : (
                vouchers.map((v) => {
                  const isCancelled = v.status === "CANCELLED";
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
                          className="hover:text-rose-600 underline cursor-pointer text-left"
                        >
                          {v.voucherNo}
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {v.date ? new Date(v.date).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-900">{v.partyName || "Payee"}</div>
                        {v.partyPhone && (
                          <div className="text-[11px] text-slate-400">{v.partyPhone}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            v.referenceType === "PURCHASE"
                              ? "bg-amber-100 text-amber-800"
                              : v.referenceType === "SALARY"
                              ? "bg-blue-100 text-blue-800"
                              : v.referenceType === "RENT"
                              ? "bg-indigo-100 text-indigo-800"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {v.referenceType === "PURCHASE"
                            ? `Pur: ${v.referenceDocNo || `#${v.referenceId}`}`
                            : v.referenceType}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                          {v.paymentMode === "BANK_TRANSFER"
                            ? "Bank Transfer"
                            : v.paymentMode === "CASH"
                            ? "Cash"
                            : v.paymentMode}
                          {v.bankName ? ` (${v.bankName})` : ""}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{money(v.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCancelled
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {v.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedVoucher(v);
                              setPrintOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-rose-700"
                            title="Print / View Voucher Slip"
                          >
                            <Printer size={15} />
                          </Button>
                          {!isCancelled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setVoucherToCancel(v);
                                setCancelReason("");
                                setCancelModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                              title="Cancel Voucher"
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
        </div>
        <VoucherPager pagination={pagination} shown={vouchers.length} loading={loading} onPage={goToPage} />
      </div>

      {/* =========================================================
          NEW PAYMENT VOUCHER DIALOG
      ========================================================= */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="!w-[95vw] !max-w-[850px] p-0 max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  New Payment Voucher
                </DialogTitle>
                <div className="text-xs text-slate-500 mt-0.5">
                  Record outgoing payments and reduce supplier outstanding invoices automatically.
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Voucher No</span>
                <span className="font-mono text-sm font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  {nextVoucherNo}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
            {/* 1. Expense Type Pills */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1.5">Payment Category</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {EXPENSE_TYPES.map((type) => {
                  const active = formData.referenceType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() =>
                      {
                        // switching category drops the supplier picked for a purchase payment (ACC-21)
                        if (type.id !== formData.referenceType && type.id !== "PURCHASE") {
                          setSelectedSupplier(null);
                          setSupplierTotalDue(0);
                          setPendingPurchases([]);
                          setPhoneQuery("");
                        }
                        setFormData((prev) => ({
                          ...prev,
                          referenceType: type.id,
                          partyId: type.id === "PURCHASE" ? prev.partyId : null,
                          purchaseId: null,
                          selectedPurchase: null,
                          amount: "",
                        }));
                      }}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        active
                          ? "border-rose-600 bg-rose-50/70 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className={`font-bold ${active ? "text-rose-900" : "text-slate-800"}`}>
                        {type.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 truncate">{type.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Supplier Purchase Flow */}
            {formData.referenceType === "PURCHASE" && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm">Supplier Purchase Payment</h3>
                    <p className="text-[11px] text-slate-500">
                      Search supplier by Phone Number to view pending outstanding dues
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Pending Dues Clearance
                  </span>
                </div>

                {/* Supplier Phone Number Input with Suggestions */}
                <div className="relative">
                  <label className="text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Supplier Phone Number *</span>
                    {selectedSupplier && (
                      <button
                        type="button"
                        onClick={handleClearSupplier}
                        className="text-[11px] text-rose-600 hover:text-rose-700 font-normal flex items-center gap-1"
                      >
                        <X className="w-3 h-3" /> Clear & Search Another
                      </button>
                    )}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <Input
                        type="text"
                        placeholder="Search supplier by phone or name..."
                        value={phoneQuery}
                        onChange={(e) => {
                          setPhoneQuery(e.target.value);
                          setShowPhoneSuggestions(true);
                        }}
                        onFocus={() => setShowPhoneSuggestions(true)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (phoneQuery.trim()) {
                              handleSelectSupplierByPhone(phoneQuery.trim());
                            }
                          }
                        }}
                        className="pl-9 pr-8 text-xs font-medium bg-white h-9"
                      />
                      {phoneQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setPhoneQuery("");
                            setShowPhoneSuggestions(false);
                          }}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (phoneQuery.trim()) {
                          handleSelectSupplierByPhone(phoneQuery.trim());
                        }
                      }}
                      disabled={loadingPurchases || !phoneQuery.trim()}
                      className="h-9 px-3 text-xs bg-white cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5 mr-1" /> Search
                    </Button>
                  </div>

                  {/* Suggestions Popover for Pending Suppliers */}
                  {showPhoneSuggestions && (
                    <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto divide-y divide-slate-100">
                      <div className="p-2 bg-slate-50 text-[11px] font-semibold text-slate-600 flex items-center justify-between">
                        <span>Suppliers with Outstanding Dues ({pendingSuppliers.length})</span>
                        <span className="text-[10px] text-slate-400 font-normal">Click to select</span>
                      </div>
                      {pendingSuppliers
                        .filter((s) => {
                          if (!phoneQuery.trim()) return true;
                          const q = phoneQuery.toLowerCase();
                          return (
                            (s.phone && s.phone.toLowerCase().includes(q)) ||
                            (s.name && s.name.toLowerCase().includes(q))
                          );
                        })
                        .map((s, idx) => (
                          <div
                            key={s.partyId || s.phone || idx}
                            onClick={() => handleSelectSupplierByPhone(s)}
                            className="p-2.5 hover:bg-rose-50 cursor-pointer flex items-center justify-between transition-colors"
                          >
                            <div className="space-y-0.5">
                              <div className="font-semibold text-xs text-slate-800 flex items-center gap-2">
                                <span className="font-mono text-rose-700 font-bold">{s.phone || "No Phone"}</span>
                                <span className="text-slate-700 font-medium">({s.name})</span>
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {s.gstin ? `GST: ${s.gstin} | ` : ""}
                                {s.invoiceCount || 0} pending {s.invoiceCount === 1 ? "invoice" : "invoices"}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                                Due: ₹{money(s.totalDueAmount)}
                              </span>
                            </div>
                          </div>
                        ))}
                      {pendingSuppliers.filter((s) => {
                        if (!phoneQuery.trim()) return true;
                        const q = phoneQuery.toLowerCase();
                        return (
                          (s.phone && s.phone.toLowerCase().includes(q)) ||
                          (s.name && s.name.toLowerCase().includes(q))
                        );
                      }).length === 0 && (
                        <div className="p-3 text-center text-xs text-slate-500">
                          No pending dues found matching "{phoneQuery}".
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {loadingPurchases && (
                  <div className="text-center p-3 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <Clock className="w-4 h-4 animate-spin text-rose-600" />
                    Fetching supplier dues & pending purchases...
                  </div>
                )}

                {/* Selected Supplier Info & Prominent Outstanding Amount Display */}
                {selectedSupplier && (
                  <div className="space-y-3">
                    {/* Supplier details card */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 text-xs flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          <User className="w-3.5 h-3.5 text-rose-600" />
                          <span>{selectedSupplier.name}</span>
                          {selectedSupplier.phone && (
                            <span className="font-mono text-slate-500 font-normal">
                              ({selectedSupplier.phone})
                            </span>
                          )}
                        </div>
                        {selectedSupplier.gstin && (
                          <div className="text-[11px] text-slate-500">GSTIN: {selectedSupplier.gstin}</div>
                        )}
                        {selectedSupplier.address && (
                          <div className="text-[11px] text-slate-500">Address: {selectedSupplier.address}</div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {pendingPurchases.length} Pending {pendingPurchases.length === 1 ? "Bill" : "Bills"}
                      </span>
                    </div>

                    {/* Prominent Outstanding Amount Banner */}
                    <div className="bg-gradient-to-r from-blue-900 to-slate-950 text-white rounded-xl p-4 shadow-sm flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-[11px] uppercase tracking-wider font-semibold opacity-90">
                          Supplier Current Outstanding Due
                        </div>
                        <div className="text-2xl font-black tracking-tight font-mono">
                          ₹{money(supplierTotalDue)}
                        </div>
                        <div className="text-[11px] opacity-80">
                          {formData.selectedPurchase
                            ? `Selected Invoice Due: ₹${money(formData.selectedPurchase.dueAmount)}`
                            : "Total across all pending purchase bills"}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            amount: formData.selectedPurchase
                              ? formData.selectedPurchase.dueAmount
                              : supplierTotalDue,
                          }))
                        }
                        className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shadow-xs"
                      >
                        Pay Full Due (₹{money(formData.selectedPurchase ? formData.selectedPurchase.dueAmount : supplierTotalDue)})
                      </Button>
                    </div>

                    {/* Pending Purchase Invoices Selection */}
                    {pendingPurchases.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                          <span>Pending Purchase Invoices ({pendingPurchases.length})</span>
                          <span className="text-[11px] text-slate-400 font-normal">
                            Click to select invoice, or leave unselected for overall settlement
                          </span>
                        </div>

                        <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
                          {/* Option to apply to overall due */}
                          <div
                            onClick={() =>
                              setFormData((prev) => ({
                                ...prev,
                                purchaseId: null,
                                selectedPurchase: null,
                                amount: supplierTotalDue,
                                narration: `Payment against overall supplier purchase dues`,
                              }))
                            }
                            className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                              !formData.purchaseId
                                ? "bg-rose-50/80 border-rose-500 shadow-2xs font-semibold"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                  !formData.purchaseId ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300"
                                }`}
                              >
                                {!formData.purchaseId && <Check className="w-3 h-3" />}
                              </div>
                              <div>
                                <div className="text-slate-900">Apply to Overall Balance (FIFO)</div>
                                <div className="text-[10px] text-slate-500 font-normal">
                                  Automatically distributes payment to oldest pending invoices
                                </div>
                              </div>
                            </div>
                            <div className="text-right font-mono font-bold text-amber-700">
                              Total: ₹{money(supplierTotalDue)}
                            </div>
                          </div>

                          {/* Specific Invoices */}
                          {pendingPurchases.map((pur) => {
                            const isSelected = formData.purchaseId === pur.id;
                            return (
                              <div
                                key={pur.id}
                                onClick={() => handleSelectPurchase(pur)}
                                className={`p-2.5 rounded-lg border cursor-pointer transition-all flex items-center justify-between text-xs ${
                                  isSelected
                                    ? "bg-rose-50/80 border-rose-500 shadow-2xs"
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                                      isSelected ? "border-rose-600 bg-rose-600 text-white" : "border-slate-300"
                                    }`}
                                  >
                                    {isSelected && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="space-y-0.5">
                                    <div className="font-bold text-slate-900 flex items-center gap-2">
                                      <span className="font-mono text-rose-800 font-bold">
                                        {pur.invoiceNo || pur.referenceNo || `PUR-#${pur.id}`}
                                      </span>
                                      <span className="text-[10px] text-slate-400 font-normal">
                                        ({new Date(pur.date).toLocaleDateString("en-IN")})
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-500">
                                      Net Total: ₹{money(pur.netPayable || pur.totalAmount)} | Paid: ₹{money(pur.paidAmount)}
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-[10px] text-slate-400">Due Balance</div>
                                  <div className="font-mono font-bold text-amber-700">
                                    ₹{money(pur.dueAmount)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* General Payee Input for Non-Purchase Expenses */}
            {formData.referenceType !== "PURCHASE" && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Pay To / Beneficiary Name *
                  </label>
                  <Input
                    placeholder={
                      formData.referenceType === "SALARY"
                        ? "Employee name..."
                        : formData.referenceType === "RENT"
                        ? "Landlord / Property name..."
                        : "Payee name..."
                    }
                    value={formData.payTo}
                    onChange={(e) => setFormData((p) => ({ ...p, payTo: e.target.value }))}
                    className="text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Phone / Reference</label>
                  <Input
                    placeholder="Contact or Reference ID..."
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
                <label className="font-semibold text-slate-700 block mb-1">
                  Payment Amount (₹) *
                  {formData.referenceType === "PURCHASE" && (supplierTotalDue > 0 || formData.selectedPurchase) && (
                    <span className="text-[10px] text-amber-700 font-semibold ml-1">
                      (Max Due: ₹{money(formData.selectedPurchase ? formData.selectedPurchase.dueAmount : supplierTotalDue)})
                    </span>
                  )}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={
                    formData.referenceType === "PURCHASE"
                      ? (formData.selectedPurchase ? formData.selectedPurchase.dueAmount : supplierTotalDue)
                      : undefined
                  }
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData((p) => ({ ...p, amount: e.target.value }))}
                  className="text-xs font-mono font-bold text-rose-800"
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
                  <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</option>
                  <option value="UPI">UPI / Net Banking</option>
                  <option value="CASH">Cash Drawer</option>
                  <option value="CARD">Debit / Credit Card</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>

            {formData.paymentMode !== "CASH" && (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Bank Name</label>
                  <Input
                    placeholder="e.g. HDFC Bank, SBI..."
                    value={formData.bankName}
                    onChange={(e) => setFormData((p) => ({ ...p, bankName: e.target.value }))}
                    className="text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">UTR / Cheque / Txn Ref</label>
                  <Input
                    placeholder="Transaction reference..."
                    value={formData.transactionRef}
                    onChange={(e) => setFormData((p) => ({ ...p, transactionRef: e.target.value }))}
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* 4. Narration */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Narration / Remarks</label>
              <Textarea
                placeholder="Details of payment..."
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
                <span className="text-rose-400">
                   {formData.referenceType === "PURCHASE"
                    ? `Supplier A/C (${formData.payTo || "Supplier"})`
                    : formData.referenceType === "SALARY"
                    ? "Salary Expense A/C"
                    : formData.referenceType === "RENT"
                    ? "Rent Expense A/C"
                    : formData.referenceType === "ELECTRICITY"
                    ? "Electricity Expense A/C"
                    : formData.referenceType === "TRANSPORT"
                    ? "Transport Expense A/C"
                    : `Expense A/C (${formData.payTo || "General"})`}
                </span>
                <span className="font-bold">₹{money(formData.amount || 0)}</span>
              </div>
              <div className="font-mono flex justify-between pl-4">
                <span className="text-blue-300">
                  To {formData.paymentMode === "CASH" ? "Cash in Hand A/C" : "Bank / UPI A/C"}
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
              {submitting ? "Processing Payment..." : "Save & Generate Voucher"}
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
              <span>Cancel Payment Voucher</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-700 py-2">
            <p>
              Are you sure you want to cancel voucher{" "}
              <span className="font-mono font-bold text-slate-900">{voucherToCancel?.voucherNo}</span> (₹{money(voucherToCancel?.amount)})?
            </p>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-800">
              <span className="font-bold">Safety Reversal: </span>
              If this voucher was paid against a supplier purchase invoice, the purchase's due amount will be restored and the payment record removed.
            </div>
            <div>
              <label className="font-semibold block mb-1">
                Cancellation Reason <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="e.g. Cancelled payment, wrong supplier, duplicate..."
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
              disabled={cancelling || !cancelReason.trim()}
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