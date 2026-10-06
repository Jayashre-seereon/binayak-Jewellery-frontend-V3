import React, { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Search,
  Printer,
  Ban,
  Scale,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Trash2,
  BookOpen,
  ArrowRight,
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
  getJournalEntries,
  createJournalEntry,
  cancelVoucher,
  getNextVoucherNumber,
  getAccounts,
} from "@/api/accounting-api";
import VoucherPrintModal from "../shared/voucher-print-modal";

const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
const money = (v) => roundMoney(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STANDARD_ACCOUNTS = [
  "Cash in Hand",
  "Bank / UPI Account",
  "Customer Receivables",
  "Supplier Payables",
  "Customer Advances",
  "Jewellery Sales Account",
  "Jewellery Purchase Account",
  "Salary Expense",
  "Rent Expense",
  "Electricity Expense",
  "Transport Expense",
  "Bank Charges",
  "Depreciation Expense",
  "Other Business Expenses",
  "Other Income",
  "Capital / Owner Equity",
  "Opening Balance Adjustment",
];

export default function JournalPage() {
  const [accountList, setAccountList] = useState(STANDARD_ACCOUNTS);

  // Filters
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [includeSystem, setIncludeSystem] = useState(false);

  const {
    vouchers: journals,
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
  } = useVoucherList(
    getJournalEntries,
    { status: statusFilter, includeSystem: includeSystem ? 1 : "" },
    { errorMessage: "Could not load journal entries." }
  );

  // Print Modal
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [printOpen, setPrintOpen] = useState(false);

  // Cancel Modal
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [voucherToCancel, setVoucherToCancel] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);

  // New Journal Form
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nextVoucherNo, setNextVoucherNo] = useState("");

  const [date, setDate] = useState(localToday());
  const [narration, setNarration] = useState("");
  const [lines, setLines] = useState([
    { accountName: "Rent Expense", debit: "", credit: "", narration: "" },
    { accountName: "Cash in Hand", debit: "", credit: "", narration: "" },
  ]);

  // The ledger account list loads once, not on every search keystroke.
  const loadAccounts = useCallback(
    () =>
      getAccounts()
        .then((accRes) => {
          if (Array.isArray(accRes) && accRes.length > 0) {
            setAccountList(Array.from(new Set([...STANDARD_ACCOUNTS, ...accRes.map((a) => a.accountName)])));
          }
        })
        .catch(() => {}),
    []
  );

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  const loadData = () => {
    reload();
  };

  // Open Create Form
  const handleOpenCreate = async () => {
    try {
      const nextNo = await getNextVoucherNumber("JOURNAL");
      setNextVoucherNo(nextNo || "JE-000001");
    } catch {
      setNextVoucherNo("JE-000001");
    }
    setDate(localToday());
    setNarration("");
    setLines([
      { accountName: "", debit: "", credit: "", narration: "" },
      { accountName: "", debit: "", credit: "", narration: "" },
    ]);
    setFormOpen(true);
  };

  const addLine = () => {
    setLines((prev) => [
      ...prev,
      { accountName: "", debit: "", credit: "", narration: "" },
    ]);
  };

  const removeLine = (idx) => {
    if (lines.length <= 2) {
      notifyError(null, "A journal entry must have at least 2 lines.");
      return;
    }
    setLines((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateLine = (idx, field, val) => {
    setLines((prev) => {
      const updated = [...prev];
      const value = field === "debit" || field === "credit" ? String(val).replace(/-/g, "") : val;
      updated[idx] = { ...updated[idx], [field]: value };
      // a row is either a debit or a credit: entering one side clears the other
      if (field === "debit" && Number(val) > 0) {
        updated[idx].credit = "";
      } else if (field === "credit" && Number(val) > 0) {
        updated[idx].debit = "";
      }
      return updated;
    });
  };

  // Calculations
  const totalDebit = roundMoney(lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0));
  const totalCredit = roundMoney(lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0));
  const diff = roundMoney(Math.abs(totalDebit - totalCredit));
  const isBalanced = diff <= 0.01 && totalDebit > 0;

  const handleSubmitJournal = async () => {
    if (!isBalanced) {
      notifyError(
        null,
        `Total Debit (₹${money(totalDebit)}) must equal Total Credit (₹${money(totalCredit)}). Imbalance: ₹${money(diff)}.`
      );
      return;
    }

    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].accountName?.trim()) {
        notifyError(null, `Please select an Account on row #${i + 1}.`);
        return;
      }
      const d = parseFloat(lines[i].debit) || 0;
      const c = parseFloat(lines[i].credit) || 0;
      if (d < 0 || c < 0) {
        notifyError(null, `Row #${i + 1}: amounts cannot be negative.`);
        return;
      }
      // exactly one side per row (CONTRACT §7)
      if ((d > 0) === (c > 0)) {
        notifyError(null, `Row #${i + 1} must have either a Debit or a Credit amount, not both.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        date,
        narration,
        entries: lines.map((l) => ({
          accountName: l.accountName.trim(),
          debit: parseFloat(l.debit) || 0,
          credit: parseFloat(l.credit) || 0,
          narration: l.narration || null,
        })),
      };

      const res = await createJournalEntry(payload);
      notifySuccess(res.message || "Journal Entry created successfully!");
      setFormOpen(false);
      loadData();
      if (res.data) {
        setSelectedVoucher(res.data);
        setPrintOpen(true);
      }
    } catch (err) {
      notifyError(err, "Failed to create journal entry.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!voucherToCancel) return;
    if (!cancelReason.trim()) {
      notifyError(null, "Please enter a reason for cancelling this journal.");
      return;
    }
    setCancelling(true);
    try {
      await cancelVoucher(voucherToCancel.id, cancelReason.trim());
      notifySuccess(`Journal ${voucherToCancel.voucherNo} cancelled successfully!`);
      setCancelModalOpen(false);
      setVoucherToCancel(null);
      setCancelReason("");
      loadData();
    } catch (err) {
      notifyError(err, "Failed to cancel journal.");
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
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Journal Entry</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
              Manual Adjustments
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Record manual double-entry accounting adjustments, depreciation, opening balances, and bank charges.
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
            <span>New Journal Entry</span>
          </Button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <BookOpen size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Total Journal Entries</div>
            <div className="text-xl font-bold text-slate-900">{pagination.total}</div>
            <div className="text-[11px] text-indigo-600 font-medium">Recorded adjustments</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Scale size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Double-Entry Status</div>
            <div className="text-lg font-bold text-emerald-700 flex items-center gap-1.5">
              <CheckCircle2 size={18} />
              <span>100% Balanced</span>
            </div>
            <div className="text-[11px] text-slate-500">Debit = Credit validation enforced</div>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-4 shadow-xs flex items-center gap-4">
          <div className="h-11 w-11 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Clock size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium text-slate-500">Total Adjustment Volume</div>
            <div className="text-xl font-bold text-slate-900">
              ₹{money(journals.reduce((s, j) => s + (j.status === "COMPLETED" ? Number(j.amount || 0) : 0), 0))}
            </div>
            <div className="text-[11px] text-slate-500">Completed journals on this page</div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border rounded-xl p-4 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search journal number, narration, account..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>
        <div className="w-full sm:w-48">
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
        <DateRangeFilter
          startDate={startDate}
          endDate={endDate}
          onStartDate={setStartDate}
          onEndDate={setEndDate}
        />
        <label className="flex items-center gap-2 text-xs text-slate-600 whitespace-nowrap">
          <input
            type="checkbox"
            checked={includeSystem}
            onChange={(e) => setIncludeSystem(e.target.checked)}
          />
          Include sale / purchase journals
        </label>
      </div>

      {/* Journals Table */}
      <div className="bg-white border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b text-slate-600 uppercase font-semibold">
              <tr>
                <th className="p-3.5">Journal No</th>
                <th className="p-3.5">Date</th>
                <th className="p-3.5">Narration / Purpose</th>
                <th className="p-3.5">Ledger Accounts Breakdown</th>
                <th className="p-3.5 text-right">Amount (₹)</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Loading journal entries...
                  </td>
                </tr>
              ) : journals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-400">
                    No journal entries found. Click "+ New Journal Entry" to create manual adjustments.
                  </td>
                </tr>
              ) : (
                journals.map((j) => {
                  const isCancelled = j.status === "CANCELLED";
                  return (
                    <tr
                      key={j.id}
                      className={`hover:bg-slate-50/60 transition-colors ${
                        isCancelled ? "bg-red-50/20 text-slate-400" : ""
                      }`}
                    >
                      <td className="p-3.5 font-mono font-bold text-slate-900">
                        <button
                          onClick={() => {
                            setSelectedVoucher(j);
                            setPrintOpen(true);
                          }}
                          className="hover:text-indigo-600 underline cursor-pointer text-left"
                        >
                          {j.voucherNo}
                        </button>
                      </td>
                      <td className="p-3.5 text-slate-600">
                        {j.date ? new Date(j.date).toLocaleDateString("en-IN") : "-"}
                      </td>
                      <td className="p-3.5 max-w-xs truncate text-slate-700 font-medium">
                        {j.narration || "Manual Adjustment"}
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {j.entries && j.entries.length > 0 ? (
                            j.entries.slice(0, 3).map((e, idx) => (
                              <div key={idx} className="flex items-center gap-2 font-mono text-[11px]">
                                <span className={e.debit > 0 ? "text-emerald-700 font-semibold" : "text-blue-700 font-semibold"}>
                                  {e.debit > 0 ? "Dr" : "Cr"}
                                </span>
                                <span className="text-slate-800">{e.accountName}</span>
                                <span className="text-slate-400">
                                  ₹{money(e.debit > 0 ? e.debit : e.credit)}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                          {j.entries && j.entries.length > 3 && (
                            <div className="text-[10px] text-slate-400 italic">
                              +{j.entries.length - 3} more line(s)
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-900 text-sm">
                        ₹{money(j.amount)}
                      </td>
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isCancelled
                              ? "bg-red-100 text-red-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {j.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setSelectedVoucher(j);
                              setPrintOpen(true);
                            }}
                            className="h-7 w-7 p-0 text-slate-600 hover:text-indigo-700"
                            title="Print / View Journal Slip"
                          >
                            <Printer size={15} />
                          </Button>
                          {!isCancelled && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setVoucherToCancel(j);
                                setCancelReason("");
                                setCancelModalOpen(true);
                              }}
                              className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                              title="Cancel Journal"
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
        <VoucherPager
          pagination={pagination}
          shown={journals.length}
          loading={loading}
          onPage={goToPage}
          noun="journal(s)"
        />
      </div>

      {/* =========================================================
          NEW JOURNAL ENTRY DIALOG
      ========================================================= */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="!w-[95vw] !max-w-[950px] p-0 max-h-[92vh] flex flex-col">
          <DialogHeader className="px-6 py-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-lg font-bold text-slate-900">
                  New Journal Entry
                </DialogTitle>
                <div className="text-xs text-slate-500 mt-0.5">
                  Multi-line manual accounting adjustments with strict Total Debit = Total Credit validation.
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Journal No</span>
                <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {nextVoucherNo}
                </span>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
            {/* Header row: Date and Quick Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Journal Date *</label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 flex items-center gap-2">
                <Scale size={20} className="text-indigo-600 shrink-0" />
                <span>
                  <strong>Accounting Rule: </strong>Every journal entry must be balanced. Add multiple debit and credit lines as needed.
                </span>
              </div>
            </div>

            {/* Entries Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <div className="bg-slate-50 p-3 border-b flex items-center justify-between">
                <span className="font-bold text-slate-800">Journal Lines (Debits & Credits)</span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={addLine}
                  className="h-7 text-xs gap-1 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                >
                  <Plus size={14} />
                  <span>Add Line</span>
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100/60 border-b text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5 text-left w-10">#</th>
                      <th className="p-2.5 text-left w-64">Ledger Account *</th>
                      <th className="p-2.5 text-right w-36">Debit (₹)</th>
                      <th className="p-2.5 text-right w-36">Credit (₹)</th>
                      <th className="p-2.5 text-left">Line Narration / Remarks</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2.5 text-slate-400 font-mono text-center">{idx + 1}</td>
                        <td className="p-2.5">
                          <input
                            list={`accounts-list-${idx}`}
                            placeholder="Select or type account..."
                            value={line.accountName}
                            onChange={(e) => updateLine(idx, "accountName", e.target.value)}
                            className="h-8 w-full rounded border border-input bg-white px-2.5 text-xs focus:ring-1 focus:ring-indigo-500 font-medium"
                          />
                          <datalist id={`accounts-list-${idx}`}>
                            {accountList.map((acc, aIdx) => (
                              <option key={aIdx} value={acc} />
                            ))}
                          </datalist>
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.debit}
                            onChange={(e) => updateLine(idx, "debit", e.target.value)}
                            className="h-8 text-xs font-mono text-right font-bold text-emerald-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={line.credit}
                            onChange={(e) => updateLine(idx, "credit", e.target.value)}
                            className="h-8 text-xs font-mono text-right font-bold text-blue-800"
                          />
                        </td>
                        <td className="p-2.5">
                          <Input
                            placeholder="Optional line narration..."
                            value={line.narration}
                            onChange={(e) => updateLine(idx, "narration", e.target.value)}
                            className="h-8 text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => removeLine(idx)}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals and Validation Footer */}
                  <tfoot>
                    <tr className="bg-slate-50 border-t-2 border-slate-300 font-bold">
                      <td colSpan={2} className="p-3 text-right uppercase text-slate-700">
                        Total Amount:
                      </td>
                      <td className="p-3 text-right font-mono text-emerald-800 text-sm">
                        ₹{money(totalDebit)}
                      </td>
                      <td className="p-3 text-right font-mono text-blue-800 text-sm">
                        ₹{money(totalCredit)}
                      </td>
                      <td colSpan={2} className="p-3">
                        {isBalanced ? (
                          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <CheckCircle2 size={16} />
                            <span>Balanced (₹{money(totalDebit)})</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                            <AlertCircle size={16} />
                            <span>
                              Imbalance: ₹{money(diff)} ({totalDebit > totalCredit ? "Debit excess" : "Credit excess"})
                            </span>
                          </div>
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Narration */}
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Main Journal Narration / Purpose *
              </label>
              <Textarea
                placeholder="Explain the reason for this journal entry (e.g. Month-end depreciation on showroom furniture, shop rent adjustment, etc.)..."
                rows={2}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitJournal}
              disabled={submitting || !isBalanced}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {submitting ? "Saving Journal..." : "Save Journal Entry"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* =========================================================
          CANCEL JOURNAL DIALOG
      ========================================================= */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-red-600 flex items-center gap-2">
              <AlertCircle size={18} />
              <span>Cancel Journal Entry</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-xs text-slate-700 py-2">
            <p>
              Are you sure you want to cancel journal{" "}
              <span className="font-mono font-bold text-slate-900">{voucherToCancel?.voucherNo}</span> (₹{money(voucherToCancel?.amount)})?
            </p>
            <div className="bg-amber-50 border border-amber-200 p-2.5 rounded text-amber-800">
              <span className="font-bold">Notice: </span>
              Cancelling this journal will reverse its accounting entries and mark them as cancelled.
            </div>
            <div>
              <label className="font-semibold block mb-1">
                Cancellation Reason <span className="text-red-600">*</span>
              </label>
              <Input
                placeholder="Reason for cancellation..."
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