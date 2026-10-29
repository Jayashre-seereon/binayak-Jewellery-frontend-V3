import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Coins,
  Download,
  Eye,
  History,
  Plus,
  Receipt,
  RotateCcw,
  ScanBarcode,
  Search,
  ShoppingBag,
  Trash2,
  UserCheck,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import { numberToWordsIndian } from "@/utils/numberToWords";
import { formatCharge, formatWeight } from "@/utils/units";
import { getParties } from "@/api/party-api";
import { lookupCustomerByPhone } from "@/api/customer-api";
import { scanBarcode } from "@/api/barcode-api";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import { playBeep, playErrorBeep, openBlob } from "@/lib/barcode/feedback";
import ScannerStatus from "@/lib/barcode/scanner-status";
import { getSales, getSalePdf, createSale } from "./sale-estimate-api";
import SalesInvoicePreviewModal from "./sales-invoice-preview-modal";
import CustomerHistoryTracking from "./customer-history-tracking";
import SaleCancelAction from "./sale-cancel-action";
import StockPicker from "./stock-picker";
import PaymentRows from "./payment-rows";
import AdjustmentPanel from "./adjustment-panel";
import { emptyPayment } from "./payment-config";
import useStoreProfile from "./use-store-profile";
import {
  computeLine,
  computeTotals,
  lineFromBillingLine,
  maxDeductionFor,
  money,
  roundMoney,
  saleTimestamp,
  todayLocal,
  weightStr,
  MAX_ROUND_OFF,
} from "./sale-calculations";

const SALES_PAGE_SIZE = 10;

const initialState = (storeState = "") => ({
  saleDate: todayLocal(),
  partyId: "",
  customerId: null,
  customerName: "",
  customerPhone: "",
  customerAddress: "",
  customerCity: "",
  customerPan: "",
  customerGst: "",
  customerState: storeState,
  placeOfSupply: storeState,
  irnNo: "",
  narration: "",
  offerDiscount: 0,
  discount: 0,
  lessUrd: 0,
  manualRoundOff: null, // { value, basis } — see computeTotals
  items: [],
  payments: [emptyPayment("")],
});

const MC_LABEL = { PERCENT: "%", PER_GRAM: "₹/g", FLAT: "₹" };

const normalizeCode = (c) => String(c || "").trim().toUpperCase();

function StatusTag({ sale }) {
  if (sale.status === "CANCELLED") {
    return (
      <span
        title={sale.cancelledReason ? `Reason: ${sale.cancelledReason}` : "Cancelled"}
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-red-50 text-red-700 border border-red-200"
      >
        <XCircle className="h-3 w-3" /> Cancelled
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Completed
    </span>
  );
}

export default function SalesPage() {
  const { storeId, storeState, learnFrom } = useStoreProfile();

  /* ---------------- list ---------------- */
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [salesPage, setSalesPage] = useState(1);
  const [salesPagination, setSalesPagination] = useState({ total: 0, totalPages: 1 });
  const [reloadKey, setReloadKey] = useState(0);
  const [parties, setParties] = useState([]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchFilter.trim());
      setSalesPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchFilter]);

  useEffect(() => {
    if (!storeId) return undefined;
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const result = await getSales({ page: salesPage, limit: SALES_PAGE_SIZE, search: debouncedSearch });
        if (!alive) return;
        setSales(Array.isArray(result?.sales) ? result.sales : []);
        setSalesPagination(result?.pagination || { total: 0, totalPages: 1 });
      } catch (error) {
        if (alive) notifyError(error, "Failed to load sales.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [storeId, salesPage, debouncedSearch, reloadKey]);

  useEffect(() => {
    if (sales[0]?.store) learnFrom(sales[0].store);
  }, [sales, learnFrom]);

  // Parties change rarely: load once per store, never on keystrokes.
  useEffect(() => {
    if (!storeId) return undefined;
    let alive = true;
    getParties(storeId)
      .then((data) => {
        if (!alive) return;
        const list = Array.isArray(data?.data) ? data.data : Array.isArray(data?.parties) ? data.parties : Array.isArray(data) ? data : [];
        setParties(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [storeId]);

  const reloadSales = () => setReloadKey((k) => k + 1);

  /* ---------------- create form ---------------- */
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [state, setState] = useState(() => initialState(storeState));
  const [validationErrors, setValidationErrors] = useState({});
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanBusy, setScanBusy] = useState(false);
  const [pendingLine, setPendingLine] = useState(null);
  const [lastScanInfo, setLastScanInfo] = useState(null);
  const [previewSale, setPreviewSale] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const [customerLookupLoading, setCustomerLookupLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(null);
  const [availableAdvances, setAvailableAdvances] = useState([]);
  const [availableOldJewellery, setAvailableOldJewellery] = useState([]);
  const [history, setHistory] = useState({ advances: [], oldGold: [], logs: [], sales: [] });
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyActiveTab, setHistoryActiveTab] = useState("logs");
  const [advanceSel, setAdvanceSel] = useState({});
  const [oldGoldSel, setOldGoldSel] = useState({});

  const barcodeInputRef = useRef(null);
  const itemsRef = useRef(state.items);
  const inFlightRef = useRef(new Set());
  useEffect(() => {
    itemsRef.current = state.items;
  }, [state.items]);

  const totals = useMemo(
    () => computeTotals(state, { storeState, advanceSel, oldGoldSel }),
    [state, storeState, advanceSel, oldGoldSel]
  );

  const updateField = (field, value) => {
    setState((prev) => ({ ...prev, [field]: value }));
    if (validationErrors[field]) setValidationErrors((prev) => ({ ...prev, [field]: null }));
  };

  /* ---------------- customer lookup ---------------- */
  const resetCustomerContext = () => {
    setCustomerFound(null);
    setAvailableAdvances([]);
    setAvailableOldJewellery([]);
    setAdvanceSel({});
    setOldGoldSel({});
    setHistory({ advances: [], oldGold: [], logs: [], sales: [] });
  };

  const handlePhoneLookup = useCallback(
    async (phone) => {
      const cleanPhone = String(phone || "").replace(/\D/g, "");
      if (cleanPhone.length !== 10) return;
      try {
        setCustomerLookupLoading(true);
        const res = await lookupCustomerByPhone(cleanPhone, storeId);
        if (!res?.success) return;
        const cust = res.customer;
        const avAdv = (res.availableAdvances || []).filter((a) => Number(a.balanceAmount) > 0);
        const avOj = (res.availableOldJewellery || []).filter((o) => Number(o.balanceAmount) > 0);
        const hasRecords = res.exists || Boolean(cust?.id) || avAdv.length > 0 || avOj.length > 0;

        if (hasRecords) {
          setCustomerFound(cust || { id: null, phone: cleanPhone });
          setState((prev) => ({
            ...prev,
            customerId: cust?.id || prev.customerId || null,
            customerName: prev.partyId && prev.customerName ? prev.customerName : cust?.name || prev.customerName || "",
            customerAddress: prev.customerAddress || cust?.address || "",
            customerCity: prev.customerCity || cust?.city || "",
            customerPan: prev.customerPan || cust?.pan || "",
            customerGst: prev.customerGst || cust?.gst || "",
            customerState: cust?.state || prev.customerState,
            placeOfSupply: cust?.state || prev.placeOfSupply,
          }));
        } else {
          setCustomerFound(null);
        }
        setAvailableAdvances(avAdv);
        setAvailableOldJewellery(avOj);
        setHistory({
          advances: res.allAdvances || [],
          oldGold: res.allOldJewellery || [],
          logs: res.adjustmentLogs || [],
          sales: res.pastSales || [],
        });
        // Nothing is pre-selected: the cashier opts in and the amount is capped to the invoice.
        setAdvanceSel({});
        setOldGoldSel({});
      } catch (error) {
        notifyError(error, "Customer lookup failed.");
      } finally {
        setCustomerLookupLoading(false);
      }
    },
    [storeId]
  );

  useEffect(() => {
    const phone = String(state.customerPhone || "").replace(/\D/g, "");
    if (phone.length !== 10) return undefined;
    const timer = setTimeout(() => handlePhoneLookup(phone), 300);
    return () => clearTimeout(timer);
  }, [state.customerPhone, handlePhoneLookup]);

  const handlePartyChange = (pId) => {
    setValidationErrors((prev) => ({ ...prev, customerName: null, customerPhone: null }));
    if (!pId) {
      setState((prev) => ({ ...prev, partyId: "" }));
      return;
    }
    const party = parties.find((p) => String(p.id) === String(pId));
    if (!party) return;
    setState((prev) => ({
      ...prev,
      partyId: pId,
      customerName: party.name || "",
      customerPhone: String(party.phone || "").replace(/\D/g, "").slice(-10),
      customerAddress: party.address || "",
      customerGst: party.gst || "",
      customerState: party.state || prev.customerState,
      placeOfSupply: party.state || prev.placeOfSupply,
    }));
  };

  const openCreateModal = () => {
    setState(initialState(storeState));
    itemsRef.current = [];
    resetCustomerContext();
    setValidationErrors({});
    setPendingLine(null);
    setLastScanInfo(null);
    setBarcodeInput("");
    setOpen(true);
  };

  /* ---------------- scanning & items ---------------- */
  const isDuplicate = (line) =>
    itemsRef.current.some((it) => Number(it.inventoryId) === Number(line.inventoryId));

  const addLine = useCallback((line) => {
    if (itemsRef.current.some((it) => Number(it.inventoryId) === Number(line.inventoryId))) return false;
    itemsRef.current = [line, ...itemsRef.current];
    setState((prev) => ({ ...prev, items: [line, ...prev.items] }));
    setValidationErrors((prev) => ({ ...prev, items: null }));
    return true;
  }, []);

  const scanner = useBarcodeScanner({
    enabled: open && !previewOpen && !historyModalOpen,
    onScan: (scan) => handleScanCode(scan.code, scan.source),
  });
  const scanConfig = scanner.config;

  const feedback = (ok) => {
    if (!scanConfig.beepOnScan) return;
    if (ok) playBeep();
    else playErrorBeep();
  };

  async function handleScanCode(rawCode, source = "manual") {
    const code = String(rawCode || "").trim();
    if (!code) return;
    const key = normalizeCode(code);

    const existing = itemsRef.current.find((it) =>
      [it.itemCode, it.barcodeNo, it.tagNo, it.huidNo].some((c) => c && normalizeCode(c) === key)
    );
    if (existing) {
      feedback(false);
      notifyInfo(`"${existing.particulars}" (${existing.itemCode}) is already in this bill.`);
      setBarcodeInput("");
      return;
    }
    if (inFlightRef.current.has(key)) return;
    inFlightRef.current.add(key);
    setScanBusy(true);
    try {
      const result = await scanBarcode(code);
      if (!result?.billingLine) throw new Error(`No sellable stock found for barcode ${code}.`);
      const line = lineFromBillingLine(result.billingLine, result);
      if (isDuplicate(line)) {
        feedback(false);
        notifyInfo(`"${line.particulars}" (${line.itemCode}) is already in this bill.`);
        return;
      }
      setLastScanInfo({ code, source, line, matchType: result.matchType, notice: result.notice || null, at: Date.now() });
      if (result.notice) notifyInfo(result.notice);
      if (scanConfig.autoAddToBill) {
        addLine(line);
        feedback(true);
        if (!(line.rate > 0)) {
          notifyError(null, `No per-piece sale rate is saved for ${line.particulars}. Enter the rate for ${line.itemCode} before saving.`);
        }
      } else {
        setPendingLine(line);
        feedback(true);
      }
      setBarcodeInput("");
    } catch (error) {
      feedback(false);
      notifyError(error, `Barcode ${code} could not be added.`);
    } finally {
      inFlightRef.current.delete(key);
      setScanBusy(false);
    }
  }

  const handleManualKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleScanCode(barcodeInput, "manual");
    }
  };

  const handleItemChange = (index, field, value) => {
    setState((prev) => {
      const items = [...prev.items];
      const current = items[index];
      let patch = { [field]: value };
      if (field === "pieces") {
        const quantity = Math.min(Number(current.availablePieces || current.stockPieces || 1), Math.max(1, Number(value) || 1));
        // Rate and charge inputs are per piece. Keep them stable as quantity changes;
        // computeLine recalculates metal and making totals from the new piece count.
        patch = { pieces: quantity };
      }
      items[index] = computeLine({ ...current, ...patch });
      return { ...prev, items };
    });
    if (field === "rate" && validationErrors.items) setValidationErrors((p) => ({ ...p, items: null }));
  };

  const removeItem = (index) => {
    setState((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  /* ---------------- deductions (SAL-07) ---------------- */
  const maxFor = (row, selection) => {
    const current = selection[row.id]?.isSelected ? Number(selection[row.id].adjustedAmount || 0) : 0;
    return maxDeductionFor({
      balance: row.balanceAmount,
      subTotal: totals.subTotal,
      otherDeductions: roundMoney(totals.totalAdjustments - current),
    });
  };

  const toggleDeduction = (setter, selection) => (row, checked) => {
    if (!checked) {
      setter((prev) => ({ ...prev, [row.id]: { isSelected: false, adjustedAmount: "" } }));
      return;
    }
    const max = maxFor(row, selection);
    if (max <= 0) {
      notifyInfo(totals.subTotal > 0 ? "The invoice value is already fully covered by the selected deductions." : "Add items to the bill before adjusting advances or old gold.");
      return;
    }
    setter((prev) => ({ ...prev, [row.id]: { isSelected: true, adjustedAmount: max } }));
  };

  const changeDeduction = (setter, selection) => (row, value) => {
    if (value === "") {
      setter((prev) => ({ ...prev, [row.id]: { ...prev[row.id], adjustedAmount: "" } }));
      return;
    }
    const n = Number(value);
    if (!Number.isFinite(n)) return;
    const clamped = Math.min(Math.max(0, n), maxFor(row, selection));
    setter((prev) => ({ ...prev, [row.id]: { ...prev[row.id], adjustedAmount: clamped === n ? value : clamped } }));
  };

  /** Shrinks deductions (Less URD → old gold → advance) until they fit inside the invoice value. */
  const fitDeductionsToInvoice = () => {
    let excess = roundMoney(totals.totalAdjustments - totals.subTotal);
    if (excess <= 0) return;
    const urd = Number(state.lessUrd || 0);
    if (urd > 0) {
      const cut = Math.min(urd, excess);
      excess = roundMoney(excess - cut);
      updateField("lessUrd", roundMoney(urd - cut));
    }
    const shrink = (sel) => {
      const next = { ...sel };
      Object.keys(next).forEach((id) => {
        if (excess <= 0 || !next[id]?.isSelected) return;
        const amt = Number(next[id].adjustedAmount || 0);
        const cut = Math.min(amt, excess);
        excess = roundMoney(excess - cut);
        const left = roundMoney(amt - cut);
        next[id] = left > 0 ? { ...next[id], adjustedAmount: left } : { isSelected: false, adjustedAmount: "" };
      });
      return next;
    };
    const og = shrink(oldGoldSel);
    const adv = shrink(advanceSel);
    setOldGoldSel(og);
    setAdvanceSel(adv);
  };

  /* ---------------- validation & submit ---------------- */
  const validateForm = () => {
    const errors = {};
    if (!state.customerName?.trim()) errors.customerName = "Customer name is required.";
    if (state.customerPhone && state.customerPhone.replace(/\D/g, "").length !== 10) {
      errors.customerPhone = "Contact number must be exactly 10 digits.";
    }
    if (!state.placeOfSupply?.trim()) errors.placeOfSupply = "Place of supply is required.";
    if (!state.saleDate) errors.saleDate = "Sale date is required.";
    else if (state.saleDate > todayLocal()) errors.saleDate = "Sale date cannot be in the future.";
    if (!state.items.length) errors.items = "Add at least one item to generate an invoice.";
    const zeroRate = state.items.find((it) => !(Number(it.rate) > 0));
    if (zeroRate) {
      errors.items = `Per-piece rate is 0 for ${zeroRate.particulars} (${zeroRate.itemCode}). Enter the rate before saving.`;
    }
    if (totals.deductionsExceed) {
      errors.deductions = `Advance + old gold + Less URD (₹${money(totals.totalAdjustments)}) exceed the invoice value (₹${money(totals.subTotal)}).`;
    }
    const overBalance = [
      ...availableAdvances.map((r) => [r, advanceSel[r.id]]),
      ...availableOldJewellery.map((r) => [r, oldGoldSel[r.id]]),
    ].find(([r, sel]) => sel?.isSelected && Number(sel.adjustedAmount || 0) > Number(r.balanceAmount || 0) + 0.01);
    if (overBalance) errors.deductions = `Adjusted amount exceeds the available balance of ${overBalance[0].receiptNo || overBalance[0].invoiceNo}.`;
    if (totals.roundOffError) errors.roundOff = totals.roundOffError;
    if (state.payments.some((p) => p.amount !== "" && Number(p.amount) < 0)) errors.payments = "Payment amounts cannot be negative.";
    else if (totals.paidAmount > totals.netPayable + 0.01) errors.payments = "Paid amount cannot exceed net payable.";
    else {
      const missingChannel = state.payments.find((p) => Number(p.amount) > 0 && ["UPI", "CARD"].includes(p.paymentMode) && !p.paymentChannel);
      if (missingChannel) errors.payments = `Select the ${missingChannel.paymentMode === "UPI" ? "UPI app" : "card terminal"} for the ₹${money(missingChannel.amount)} payment.`;
    }
    setValidationErrors(errors);
    return errors;
  };

  const handleSubmitSale = async () => {
    const errors = validateForm();
    const first = Object.values(errors).find(Boolean);
    if (first) {
      notifyError(null, first);
      return;
    }

    const advanceAdjustments = availableAdvances
      .filter((a) => advanceSel[a.id]?.isSelected && Number(advanceSel[a.id].adjustedAmount) > 0)
      .map((a) => ({ advanceReceiveId: Number(a.id), amount: roundMoney(advanceSel[a.id].adjustedAmount), notes: null }));
    const oldGoldAdjustments = availableOldJewellery
      .filter((o) => oldGoldSel[o.id]?.isSelected && Number(oldGoldSel[o.id].adjustedAmount) > 0)
      .map((o) => ({
        purchaseId: Number(o.id),
        amount: roundMoney(oldGoldSel[o.id].adjustedAmount),
        description: o.itemSummary || "Old jewellery value adjusted",
        notes: null,
      }));

    // GST, weights, store GSTIN/CIN and the final round-off are decided by the server.
    const payload = {
      saleDate: saleTimestamp(state.saleDate),
      partyId: state.partyId ? Number(state.partyId) : null,
      customerId: state.customerId || null,
      customerName: state.customerName.trim(),
      customerPhone: state.customerPhone?.trim() || null,
      customerAddress: state.customerAddress?.trim() || null,
      customerCity: state.customerCity?.trim() || null,
      customerPan: state.customerPan?.trim().toUpperCase() || null,
      customerGst: state.customerGst?.trim().toUpperCase() || null,
      customerState: (state.customerState || state.placeOfSupply)?.trim().toUpperCase() || null,
      placeOfSupply: state.placeOfSupply.trim().toUpperCase(),
      irnNo: state.irnNo?.trim() || null,
      narration: state.narration?.trim() || null,
      offerDiscount: totals.offerDiscount,
      discount: totals.discount,
      lessUrd: totals.lessUrd,
      roundOff: totals.roundOff,
      paidAmount: totals.paidAmount,
      advanceAdjustments,
      oldGoldAdjustments,
      items: state.items.map((it) => ({
        inventoryId: Number(it.inventoryId),
        particulars: it.particulars,
        itemCode: it.itemCode,
        huidNo: it.huidNo || null,
        hsnCode: it.hsnCode || null,
        purityName: it.purityName || null,
        purity: it.purity !== null && it.purity !== "" && it.purity !== undefined ? Number(it.purity) : null,
        pieces: Math.max(1, Number(it.pieces || 1)),
        grossWeight: Number(it.grossWeight || 0),
        stoneWeight: Number(it.stoneWeight || 0),
        netWeight: Number(it.netWeight || 0),
        rate: Number(it.rate || 0),
        metalAmount: Number(it.metalAmount || 0),
        makingChargeType: it.makingChargeType,
        makingChargeRate: Number(it.makingChargeRate || 0),
        makingCharges: Number(it.makingCharges || 0),
        stoneAmount: Number(it.stoneAmount || 0),
        otherCharges: Number(it.otherCharges || 0),
        discount: Number(it.discount || 0),
        totalAmount: Number(it.totalAmount || 0),
      })),
      payments: state.payments
        .filter((p) => Number(p.amount || 0) > 0)
        .map((p) => ({
          paymentMode: p.paymentMode,
          paymentChannel: p.paymentChannel || null,
          amount: roundMoney(p.amount),
          transactionId: p.transactionId || null,
          referenceNo: p.referenceNo || p.transactionId || null,
          description: p.description || null,
          paymentDate: saleTimestamp(state.saleDate),
          narration: p.narration || null,
        })),
    };

    try {
      setSaving(true);
      const result = await createSale(payload);
      const sale = result?.sale || null;
      notifySuccess(`Sale invoice ${result?.invoiceNo || sale?.invoiceNo || ""} created.`);
      for (const alert of sale?.stockAlerts || []) {
        notifyInfo(alert.type === "SOLD_OUT"
          ? `${alert.name} is Sold Out. Available stock: 0 Pcs.`
          : `Low stock: ${alert.name} has ${alert.availableQuantity} Pcs available (50 or fewer).`);
      }
      if (sale && Math.abs(Number(sale.netPayable || 0) - totals.netPayable) > 0.5) {
        notifyInfo(`Server recalculated net payable to ₹${money(sale.netPayable)} (preview showed ₹${money(totals.netPayable)}).`);
      }
      setOpen(false);
      setSalesPage(1);
      reloadSales();
      if (sale) {
        setPreviewSale(sale);
        setPreviewOpen(true);
      }
    } catch (error) {
      notifyError(error, "Unable to create sale. Please check values and try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadInvoice = async (sale) => {
    try {
      const pdf = await getSalePdf(sale.id);
      openBlob(pdf, `Invoice-${sale.invoiceNo || sale.id}.pdf`);
    } catch (error) {
      notifyError(error, "Failed to open sale invoice.");
    }
  };

  const handleCancelled = (updated) => {
    setSales((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
    if (previewSale?.id === updated.id) setPreviewSale((p) => ({ ...p, ...updated }));
    reloadSales();
  };

  const roundOffInputValue =
    state.manualRoundOff && state.manualRoundOff.basis === totals.unroundedNet
      ? state.manualRoundOff.value
      : totals.autoRoundOff;

  const hasHistory =
    customerFound || history.sales.length || history.advances.length || history.oldGold.length || history.logs.length;

  /* ---------------- render ---------------- */
  return (
    <div className="space-y-4 font-sans">
      <h1 className="text-xl font-semibold">Sales</h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by Invoice No, Customer Name, Phone..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 text-xs focus-visible:ring-blue-500"
          />
        </div>
        <Button onClick={openCreateModal} className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-sm font-semibold">
          <Plus className="h-4 w-4" /> Create Sale
        </Button>
      </div>

      {/* SALES LIST */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-xs font-semibold text-slate-600 uppercase border-b border-slate-200">
            <tr>
              <th className="p-3 text-left">Invoice No</th>
              <th className="p-3 text-left">Customer Name</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-center">Items</th>
              <th className="p-3 text-right">Taxable (₹)</th>
              <th className="p-3 text-right">Adjustments (₹)</th>
              <th className="p-3 text-right">Net Payable (₹)</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading && !sales.length ? (
              <tr>
                <td className="p-8 text-center text-slate-400" colSpan={9}>
                  Loading sales invoices...
                </td>
              </tr>
            ) : sales.length ? (
              sales.map((sale) => {
                const totalAdj = Number(sale.advanceAmount || 0) + Number(sale.oldGoldAmount || 0) + Number(sale.lessUrd || 0);
                const cancelled = sale.status === "CANCELLED";
                return (
                  <tr key={sale.id} className={`transition ${cancelled ? "bg-red-50/30 text-slate-400" : "hover:bg-blue-50/40"}`}>
                    <td className={`p-3 font-semibold ${cancelled ? "line-through text-slate-400" : "text-blue-700"}`}>{sale.invoiceNo}</td>
                    <td className="p-3">
                      <div className="font-medium text-slate-900">{sale.party?.name || sale.customerName || "-"}</div>
                      {sale.customerPhone && <div className="text-xs text-slate-400">{sale.customerPhone}</div>}
                    </td>
                    <td className="p-3 text-xs text-slate-600">
                      {sale.saleDate ? new Date(sale.saleDate).toLocaleDateString("en-IN") : "-"}
                    </td>
                    <td className="p-3 text-center font-medium text-slate-800">{sale.items?.length || 0}</td>
                    <td className="p-3 text-right">{money(sale.taxableAmount)}</td>
                    <td className="p-3 text-right">
                      {totalAdj > 0 ? (
                        <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">-₹{money(totalAdj)}</span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-3 text-right font-bold text-slate-900">₹{money(sale.netPayable)}</td>
                    <td className="p-3 text-center">
                      <StatusTag sale={sale} />
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setPreviewSale(sale);
                            setPreviewOpen(true);
                          }}
                          title="View / Print Tax Invoice"
                          className="hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadInvoice(sale)}
                          title="Open PDF"
                          className="hover:text-blue-600 hover:bg-blue-50 h-8 w-8"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <SaleCancelAction sale={sale} onCancelled={handleCancelled} />
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td className="p-8 text-center text-slate-400" colSpan={9}>
                  No sales invoices found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
        <span>
          Showing {sales.length} of {salesPagination.total || 0} sales
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={salesPage <= 1 || loading} onClick={() => setSalesPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {salesPage} of {salesPagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            disabled={salesPage >= (salesPagination.totalPages || 1) || loading}
            onClick={() => setSalesPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* CREATE SALE MODAL */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!w-[96vw] !max-w-[1440px] h-[94vh] p-0 flex flex-col bg-slate-50 border border-slate-300">
          <DialogHeader className="border-b border-slate-200 px-4 sm:px-6 py-3.5 bg-white flex flex-row flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-md">
                <ShoppingBag className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-slate-900">Create Jewellery Tax Invoice</DialogTitle>
                <p className="text-xs text-slate-500">Scan pieces, check customer adjustments, collect payment.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScannerStatus scanner={scanner} />
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="text-xs">
                Close
              </Button>
              <Button
                onClick={handleSubmitSale}
                disabled={saving || state.items.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-sm"
              >
                {saving ? "Generating Invoice..." : "Create"}
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
            {/* 1. SCANNER BAR */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-4 shadow-sm space-y-3">
              <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
                {scanConfig.allowManualEntry ? (
                  <div className="flex-1 flex items-center gap-2" data-scanner-ignore>
                    <div className="relative flex-1">
                      <ScanBarcode className="absolute left-3 top-2.5 h-5 w-5 text-blue-600" />
                      <Input
                        ref={barcodeInputRef}
                        autoFocus
                        placeholder="Scan anywhere, or type Barcode / Tag / HUID and press Enter"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={handleManualKeyDown}
                        className="pl-10 h-10 text-xs font-semibold border-blue-300 bg-white shadow-inner focus-visible:ring-blue-500"
                      />
                    </div>
                    <Button
                      onClick={() => handleScanCode(barcodeInput, "manual")}
                      disabled={scanBusy || !barcodeInput.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 h-10 text-xs font-semibold"
                    >
                      <ScanBarcode className="h-4 w-4" /> {scanBusy ? "Looking up…" : "Add"}
                    </Button>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center gap-2 text-xs font-semibold text-blue-900">
                    <ScanBarcode className="h-5 w-5 text-blue-600" /> Scan a piece — manual entry is disabled in Barcode Settings.
                  </div>
                )}
                <div className="w-full md:w-96">
                  <StockPicker
                    onPick={(inv) => handleScanCode(inv.barcodeNo || inv.tagNo || inv.inventoryCode, "picker")}
                    excludeIds={state.items.map((it) => it.inventoryId)}
                  />
                </div>
              </div>

              {pendingLine && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-blue-300 bg-white px-3 py-2 text-xs">
                  <span>
                    <strong>{pendingLine.particulars}</strong> · {pendingLine.itemCode} · {pendingLine.purityName} ·{" "}
                    {formatWeight(pendingLine.netWeight)} · ₹{money(pendingLine.totalAmount)}
                  </span>
                  <span className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (!addLine(pendingLine)) notifyInfo("This piece is already in the bill.");
                        setPendingLine(null);
                      }}
                    >
                      Add to bill
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setPendingLine(null)}>
                      Discard
                    </Button>
                  </span>
                </div>
              )}
              {lastScanInfo && !pendingLine && (
                <p className="text-[11px] text-blue-900/70">
                  Last scan: <span className="font-mono">{lastScanInfo.code}</span> → {lastScanInfo.line.particulars} (
                  {lastScanInfo.line.itemCode}){lastScanInfo.matchType === "ITEM" ? " · matched by item code" : ""}
                  {lastScanInfo.notice && <span className="block font-medium text-amber-800">{lastScanInfo.notice}</span>}
                </p>
              )}
            </div>

            {/* 2. CUSTOMER & INVOICE */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-2 gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Customer & Invoice Information</h3>
                  {customerFound ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <UserCheck className="h-3.5 w-3.5 text-emerald-600" />
                      Existing Customer{customerFound.customerCode ? `: ${customerFound.customerCode}` : customerFound.id ? `: #${customerFound.id}` : ""}
                    </span>
                  ) : state.customerPhone?.length === 10 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      New Customer (registered on save)
                    </span>
                  ) : null}
                </div>
                {hasHistory ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setHistoryModalOpen(true)}
                    className="h-7 text-xs font-semibold text-blue-700 border-blue-300 bg-blue-50 hover:bg-blue-100 gap-1.5"
                  >
                    <History className="h-3.5 w-3.5 text-blue-600" />
                    Customer History
                  </Button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Sale Invoice Date <span className="text-red-500">*</span></label>
                  <Input
                    type="date"
                    max={todayLocal()}
                    value={state.saleDate}
                    onChange={(e) => updateField("saleDate", e.target.value)}
                    className={`h-9 text-xs ${validationErrors.saleDate ? "border-red-500" : ""}`}
                  />
                  {validationErrors.saleDate && <span className="text-[10px] text-red-500 block mt-0.5">{validationErrors.saleDate}</span>}
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Customer Master</label>
                  <select
                    className="h-9 w-full rounded border border-slate-300 px-2.5 text-xs bg-white focus:ring-2 focus:ring-blue-500"
                    value={state.partyId}
                    onChange={(e) => handlePartyChange(e.target.value)}
                  >
                    <option value="">-- Walk-in / New Customer --</option>
                    {parties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.phone ? `(${p.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">
                    Customer Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder="Enter customer name"
                    value={state.customerName}
                    onChange={(e) => updateField("customerName", e.target.value)}
                    className={`h-9 text-xs ${validationErrors.customerName ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                  />
                  {validationErrors.customerName && (
                    <span className="text-[10px] text-red-500 font-medium block mt-0.5">{validationErrors.customerName}</span>
                  )}
                </div>

                <div>
                  <label className="text-slate-600 font-semibold mb-1 flex items-center justify-between">
                    <span>Contact No. (Phone)</span>
                    {customerLookupLoading && <span className="text-[10px] text-blue-600 font-normal animate-pulse">Checking...</span>}
                  </label>
                  <div className="relative">
                    <Input
                      placeholder="10-digit mobile number"
                      value={state.customerPhone}
                      maxLength={10}
                      inputMode="numeric"
                      onChange={(e) => {
                        updateField("customerPhone", e.target.value.replace(/\D/g, ""));
                        if (e.target.value.replace(/\D/g, "").length !== 10) resetCustomerContext();
                      }}
                      className={`h-9 text-xs pr-8 ${validationErrors.customerPhone ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                    />
                    {state.customerPhone?.length === 10 && (
                      <button
                        type="button"
                        onClick={() => handlePhoneLookup(state.customerPhone)}
                        className="absolute right-2 top-2 text-slate-400 hover:text-blue-600"
                        title="Check phone"
                      >
                        <Search className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {validationErrors.customerPhone && (
                    <span className="text-[10px] text-red-500 font-medium block mt-0.5">{validationErrors.customerPhone}</span>
                  )}
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">City</label>
                  <Input placeholder="City - PIN" value={state.customerCity} onChange={(e) => updateField("customerCity", e.target.value)} className="h-9 text-xs" />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Address</label>
                  <Input
                    placeholder="Street / locality address"
                    value={state.customerAddress}
                    onChange={(e) => updateField("customerAddress", e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Customer PAN No.</label>
                  <Input
                    placeholder="e.g. ABCDE1234F"
                    value={state.customerPan}
                    maxLength={10}
                    onChange={(e) => updateField("customerPan", e.target.value.toUpperCase())}
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Customer GSTIN</label>
                  <Input
                    placeholder="15-digit GSTIN"
                    value={state.customerGst}
                    maxLength={15}
                    onChange={(e) => updateField("customerGst", e.target.value.toUpperCase())}
                    className="h-9 text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">
                    Place of Supply <span className="text-red-500">*</span>
                  </label>
                  <Input
                    placeholder={storeState ? `State e.g. ${storeState}` : "Customer's state"}
                    value={state.placeOfSupply}
                    onChange={(e) => updateField("placeOfSupply", e.target.value.toUpperCase())}
                    className={`h-9 text-xs uppercase font-medium ${validationErrors.placeOfSupply ? "border-red-500 focus-visible:ring-red-400" : ""}`}
                  />
                  <span className={`text-[10px] block mt-0.5 ${totals.isInterState ? "text-amber-700" : "text-slate-500"}`}>
                    {storeState
                      ? totals.isInterState
                        ? `Inter-state (store in ${storeState}) → IGST 3%`
                        : `Intra-state (${storeState}) → CGST 1.5% + SGST 1.5%`
                      : "Store state not loaded — GST type is decided when saving."}
                  </span>
                  {validationErrors.placeOfSupply && (
                    <span className="text-[10px] text-red-500 font-medium block">{validationErrors.placeOfSupply}</span>
                  )}
                </div>
              </div>
            </div>

            {/* 3. ADJUSTMENTS */}
            {(availableAdvances.length > 0 || availableOldJewellery.length > 0) && (
              <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50/40 p-4 shadow-sm space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-emerald-700" />
                    <h3 className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Available Customer Adjustments</h3>
                  </div>
                  <span className="text-xs font-semibold text-emerald-800">
                    Selected: ₹{money(totals.totalAdvanceAdjusted + totals.totalOldGoldAdjusted)} · Invoice value: ₹{money(totals.subTotal)}
                  </span>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AdjustmentPanel
                    title="Advance Payments"
                    icon={Receipt}
                    tone="emerald"
                    rows={availableAdvances}
                    selection={advanceSel}
                    onToggle={toggleDeduction(setAdvanceSel, advanceSel)}
                    onAmount={changeDeduction(setAdvanceSel, advanceSel)}
                    maxFor={(row) => maxFor(row, advanceSel)}
                    docNo={(row) => row.receiptNo}
                    docTotal={(row) => row.totalAmount}
                    formatMoney={money}
                    emptyText="No unused advance receipts available."
                  />
                  <AdjustmentPanel
                    title="Old Jewellery Purchases"
                    icon={Wallet}
                    tone="amber"
                    rows={availableOldJewellery}
                    selection={oldGoldSel}
                    onToggle={toggleDeduction(setOldGoldSel, oldGoldSel)}
                    onAmount={changeDeduction(setOldGoldSel, oldGoldSel)}
                    maxFor={(row) => maxFor(row, oldGoldSel)}
                    docNo={(row) => row.invoiceNo}
                    docTotal={(row) => row.totalValuation}
                    subLine={(row) => `${row.itemSummary || ""} (Gross: ${weightStr(row.totalGrossWeight)}g)`}
                    formatMoney={money}
                    emptyText="No unused old jewellery purchases available."
                  />
                </div>
              </div>
            )}

            {/* 4. ITEMS */}
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Invoice Items ({state.items.length})</h3>
                <div className="text-xs font-semibold text-slate-600 flex flex-wrap gap-4">
                  <span>
                    Gross Wt: <strong className="text-slate-900">{weightStr(totals.totalGrossWeight)}g</strong>
                  </span>
                  <span>
                    Net Wt: <strong className="text-slate-900">{weightStr(totals.totalNetWeight)}g</strong>
                  </span>
                  <span>
                    Gross Total: <strong className="text-blue-600">₹{money(totals.grossAmount)}</strong>
                  </span>
                </div>
              </div>
              {validationErrors.items && (
                <div className="flex items-center gap-1.5 rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                  <AlertTriangle className="h-3.5 w-3.5" /> {validationErrors.items}
                </div>
              )}

              {state.items.length === 0 ? (
                <div className="py-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  <ScanBarcode className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-xs font-medium">No items yet. Scan a barcode or search available stock above.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1100px] text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 uppercase">
                        <th className="p-2 text-center w-8">#</th>
                        <th className="p-2 text-left min-w-[150px]">Item Particulars</th>
                        <th className="p-2 text-left min-w-[90px]">Code / HUID</th>
                        <th className="p-2 text-left">Purity</th>
                        <th className="p-2 text-right">Pcs</th>
                        <th className="p-2 text-right">Gross Wt</th>
                        <th className="p-2 text-right">Stone Wt</th>
                        <th className="p-2 text-right">Net Wt</th>
                        <th className="p-2 text-right min-w-[80px]">Rate(₹/Pc)</th>
                        <th className="p-2 text-right">Metal Amt</th>
                        <th className="p-2 text-center min-w-[120px]">Making</th>
                        <th className="p-2 text-right">Making Ch.</th>
                        <th className="p-2 text-right">Stone Amt</th>
                        <th className="p-2 text-right">Other Ch.</th>
                        <th className="p-2 text-right">Disc.</th>
                        <th className="p-2 text-right min-w-[95px]">Total(₹)</th>
                        <th className="p-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {state.items.map((it, idx) => {
                        const zeroRate = !(Number(it.rate) > 0);
                        return (
                          <tr key={it.inventoryId || idx} className="hover:bg-blue-50/20">
                            <td className="p-2 text-center font-semibold text-slate-400">{idx + 1}</td>
                            <td className="p-2 font-medium text-slate-900">
                              {it.particulars}
                              {it.hsnCode && <div className="text-[10px] text-slate-400">HSN {it.hsnCode}</div>}
                            </td>
                            <td className="p-2 font-mono text-[11px] text-blue-700">
                              {it.itemCode}
                              {it.huidNo && <div className="text-[10px] text-slate-500">HUID {it.huidNo}</div>}
                            </td>
                            <td className="p-2 font-semibold text-amber-700">{it.purityName || "-"}</td>
                            <td className="p-2 text-center">
                              <Input
                                type="number"
                                min="1"
                                max={it.availablePieces || it.stockPieces || 1}
                                step="1"
                                value={it.pieces}
                                onChange={(e) => handleItemChange(idx, "pieces", e.target.value)}
                                className="h-7 w-16 px-1 text-center text-xs"
                                aria-label={`Quantity, ${it.availablePieces || it.stockPieces || 1} pieces available`}
                              />
                              <div className="text-[10px] text-slate-500">of {it.availablePieces || it.stockPieces || 1} available</div>
                            </td>
                            <td className="p-2 text-right">{weightStr(it.grossWeight)}</td>
                            <td className="p-2 text-right">{weightStr(it.stoneWeight)}</td>
                            <td className="p-2 text-right font-bold text-slate-900">{weightStr(it.netWeight)}</td>
                            <td className="p-2">
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={it.rate}
                                title={zeroRate ? "No per-piece sale rate saved; enter it here" : `Rate source: ${it.rateSource || "manual"}`}
                                onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                                className={`h-7 text-right text-xs w-20 px-1 font-semibold ${zeroRate ? "border-red-500 bg-red-50 text-red-700" : ""}`}
                              />
                            </td>
                            <td className="p-2 text-right font-semibold text-slate-900">{money(it.metalAmount)}</td>
                            <td className="p-2">
                              <div className="flex gap-1 items-center justify-center">
                                <select
                                  value={it.makingChargeType}
                                  onChange={(e) => handleItemChange(idx, "makingChargeType", e.target.value)}
                                  className="h-7 text-[10px] rounded border border-slate-300 bg-white px-1"
                                >
                                  <option value="PERCENT">%</option>
                                  <option value="PER_GRAM">/g</option>
                                  <option value="FLAT">Flat ₹</option>
                                </select>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it.makingChargeRate}
                                  title={it.makingChargeType === "FLAT" ? "Making charge amount (₹)" : `Making charge ${MC_LABEL[it.makingChargeType]}`}
                                  onChange={(e) => handleItemChange(idx, "makingChargeRate", e.target.value)}
                                  className="h-7 text-right text-xs w-16 px-1"
                                />
                              </div>
                            </td>
                            <td className="p-2 text-right font-medium">
                              <div>{money(it.makingCharges)}</div>
                              <div className="text-[10px] text-slate-500">{formatCharge(it.makingCharges, it.makingChargeType, it.makingChargeRate)}</div>
                            </td>
                            {["stoneAmount", "otherCharges", "discount"].map((f) => (
                              <td key={f} className="p-2">
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={it[f]}
                                  onChange={(e) => handleItemChange(idx, f, e.target.value)}
                                  className={`h-7 text-right text-xs w-16 px-1 ${f === "discount" ? "text-red-600 font-medium" : ""}`}
                                />
                              </td>
                            ))}
                            <td className="p-2 text-right font-bold text-blue-900">₹{money(it.totalAmount)}</td>
                            <td className="p-2 text-center">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeItem(idx)}
                                title="Remove item"
                                className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 5. PAYMENTS & SUMMARY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
              <div className="lg:col-span-7 space-y-3">
                <PaymentRows
                  payments={state.payments}
                  onChange={(payments) => {
                    setState((prev) => ({ ...prev, payments }));
                    if (validationErrors.payments) setValidationErrors((p) => ({ ...p, payments: null }));
                  }}
                  netPayable={totals.netPayable}
                  formatMoney={money}
                  error={validationErrors.payments}
                />

                <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm space-y-2 overflow-x-auto">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-1">
                    Tax Summary ({totals.isInterState ? "Inter-state" : "Intra-state"})
                  </h3>
                  <table className="w-full text-xs text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-1.5">Taxable (₹)</th>
                        <th className="p-1.5 text-right">CGST {totals.cgstPercent}%</th>
                        <th className="p-1.5 text-right">SGST {totals.sgstPercent}%</th>
                        <th className="p-1.5 text-right">IGST {totals.igstPercent}%</th>
                        <th className="p-1.5 text-right">Total Tax (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-1.5">{money(totals.taxableAmount)}</td>
                        <td className="p-1.5 text-right">₹{money(totals.cgstAmount)}</td>
                        <td className="p-1.5 text-right">₹{money(totals.sgstAmount)}</td>
                        <td className="p-1.5 text-right">₹{money(totals.igstAmount)}</td>
                        <td className="p-1.5 text-right font-bold text-blue-900">₹{money(totals.totalTax)}</td>
                      </tr>
                    </tbody>
                  </table>
                  <p className="text-[10px] text-slate-500">GST is computed by the server from the store's state and the place of supply.</p>
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-sm space-y-2 text-xs">
                  <div>
                    <span className="font-bold text-slate-700">Invoice Value [ In Words ] : </span>
                    <span className="font-semibold text-slate-900 italic">{numberToWordsIndian(totals.netPayable)}</span>
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Narration / Remarks</label>
                    <Input
                      placeholder="Enter invoice remarks or narration..."
                      value={state.narration}
                      onChange={(e) => updateField("narration", e.target.value)}
                      className="h-8 text-xs focus-visible:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <div className="rounded-lg border-2 border-blue-200 bg-white p-4 shadow-md space-y-2 text-xs">
                  <div className="bg-blue-50 text-blue-950 font-bold uppercase tracking-wider py-1.5 px-3 rounded text-center border border-blue-200">
                    Invoice Amount Calculation
                  </div>
                  <div className="space-y-1.5 divide-y divide-slate-100 pt-1">
                    <div className="flex justify-between py-1 font-medium">
                      <span className="text-slate-700">Gross Amount</span>
                      <span className="font-bold text-slate-900 text-sm">₹{money(totals.grossAmount)}</span>
                    </div>
                    {[
                      ["offerDiscount", "Offer Discount [-]"],
                      ["discount", "Discount [-]"],
                    ].map(([field, label]) => (
                      <div key={field} className="flex justify-between items-center py-1">
                        <span className="text-red-600 font-medium">{label}</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={state[field]}
                          onChange={(e) => updateField(field, e.target.value)}
                          className="w-28 h-7 text-right text-xs font-semibold text-red-600 focus-visible:ring-red-400"
                        />
                      </div>
                    ))}
                    <div className="flex justify-between py-1.5 font-bold bg-blue-50/60 px-2 rounded text-blue-950">
                      <span>Taxable Amount</span>
                      <span>₹{money(totals.taxableAmount)}</span>
                    </div>
                    {totals.isInterState ? (
                      <div className="flex justify-between py-1 text-slate-600">
                        <span>IGST [ + ] ({totals.igstPercent}%)</span>
                        <span>₹{money(totals.igstAmount)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between py-1 text-slate-600">
                          <span>CGST [ + ] ({totals.cgstPercent}%)</span>
                          <span>₹{money(totals.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between py-1 text-slate-600">
                          <span>SGST [ + ] ({totals.sgstPercent}%)</span>
                          <span>₹{money(totals.sgstAmount)}</span>
                        </div>
                      </>
                    )}
                    <div className="flex justify-between py-1.5 font-bold bg-slate-50 px-2 rounded text-slate-800">
                      <span>Sub Total (Invoice Value)</span>
                      <span>₹{money(totals.subTotal)}</span>
                    </div>
                    {totals.totalAdvanceAdjusted > 0 && (
                      <div className="flex justify-between py-1 text-emerald-700 font-semibold bg-emerald-50/60 px-2 rounded">
                        <span>Advance Adjusted [-]</span>
                        <span>-₹{money(totals.totalAdvanceAdjusted)}</span>
                      </div>
                    )}
                    {totals.totalOldGoldAdjusted > 0 && (
                      <div className="flex justify-between py-1 text-amber-700 font-semibold bg-amber-50/60 px-2 rounded">
                        <span>Old Jewellery Value [-]</span>
                        <span>-₹{money(totals.totalOldGoldAdjusted)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-700 font-medium">Less URD [-]</span>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={state.lessUrd}
                        onChange={(e) => updateField("lessUrd", e.target.value)}
                        className="w-28 h-7 text-right text-xs font-medium focus-visible:ring-blue-500"
                      />
                    </div>
                    {(totals.deductionsExceed || validationErrors.deductions) && (
                      <div className="rounded border border-red-200 bg-red-50 px-2 py-1.5 text-[11px] font-semibold text-red-600 space-y-1">
                        <div>
                          {validationErrors.deductions ||
                            `Deductions exceed the invoice value by ₹${money(totals.totalAdjustments - totals.subTotal)}.`}
                        </div>
                        {totals.deductionsExceed && (
                          <Button size="xs" variant="outline" onClick={fitDeductionsToInvoice} className="text-red-700 border-red-300">
                            Fit deductions to invoice
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-700 font-medium">
                        Round Off [ +/- ] {totals.isManualRoundOff ? <span className="text-[10px] text-blue-600">(manual)</span> : <span className="text-[10px] text-slate-400">(auto)</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        {state.manualRoundOff && (
                          <button
                            type="button"
                            title="Back to automatic round-off"
                            onClick={() => updateField("manualRoundOff", null)}
                            className="text-slate-400 hover:text-blue-600"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <Input
                          type="number"
                          step="0.01"
                          min={-MAX_ROUND_OFF}
                          max={MAX_ROUND_OFF}
                          value={roundOffInputValue}
                          onChange={(e) =>
                            setState((prev) => ({ ...prev, manualRoundOff: { value: e.target.value, basis: totals.unroundedNet } }))
                          }
                          className={`w-28 h-7 text-right text-xs font-medium focus-visible:ring-blue-500 ${totals.roundOffError ? "border-red-500" : ""}`}
                        />
                      </span>
                    </div>
                    {totals.roundOffError && <div className="text-[11px] font-semibold text-red-600">{totals.roundOffError}</div>}
                    <div className="flex justify-between py-2.5 px-3 rounded-md bg-blue-600 text-white font-extrabold text-base items-center shadow-sm">
                      <span>Net Payable</span>
                      <span>₹{money(totals.netPayable)}</span>
                    </div>
                    <div className="flex justify-between py-1 text-emerald-700 font-semibold">
                      <span>Paid Amount</span>
                      <span>₹{money(totals.paidAmount)}</span>
                    </div>
                    {totals.dueAmount > 0.01 && (
                      <div className="flex justify-between py-1.5 px-2 rounded bg-amber-50 border border-amber-200 text-amber-800 font-bold">
                        <span>Customer Due Balance</span>
                        <span>₹{money(totals.dueAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={historyModalOpen} onOpenChange={setHistoryModalOpen}>
        <DialogContent className="!w-[90vw] !max-w-[1050px] max-h-[88vh] flex flex-col p-0 bg-white">
          <CustomerHistoryTracking
            customerName={state.customerName}
            customerPhone={state.customerPhone}
            customerId={customerFound?.id || state.customerId}
            availableAdvances={availableAdvances}
            availableOldJewellery={availableOldJewellery}
            allAdvancesHistory={history.advances}
            allOldJewelleryHistory={history.oldGold}
            adjustmentLogsHistory={history.logs}
            pastSalesHistory={history.sales}
            activeTab={historyActiveTab}
            onTabChange={setHistoryActiveTab}
            formatMoney={money}
          />
        </DialogContent>
      </Dialog>

      <SalesInvoicePreviewModal open={previewOpen} onOpenChange={setPreviewOpen} sale={previewSale} onCancelled={handleCancelled} />
    </div>
  );
}
