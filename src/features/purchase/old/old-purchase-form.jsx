import { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { Select } from "antd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { onlyDigits, onlyAlphaNumeric } from "@/utils/validation";
import { getEmployees } from "@/api/employee-api";
import { getParties } from "@/api/party-api";
import { getStones, getStonesByProductAndItem } from "@/api/stone-api";
import { getItemOptions } from "@/api/item-api";
import { getRates, pickLatestRate } from "@/api/rate-api";
import { getCategory } from "@/api/category-api";
import { resolveStoreState } from "@/api/store-api";
import { PURCHASE_TYPES, PAYMENT_MODES, CUSTOMER_ID_TYPES, getGrades } from "@/api/old-purchase-api";
import { getActiveStoreId, useAuthStore } from "@/store/authStore";
import { notifyError } from "@/utils/notify";
import { openStoredFile } from "@/api/file-api";
import { numberToWordsIndian } from "@/utils/numberToWords";
import {
  DEFAULT_STORE_STATE,
  calcLine,
  calcTotals,
  defaultApplyGst,
  isLegacyPurchase,
  isVoucherPayment,
  lineErrors,
  roundMoney,
} from "./purchase-calc";

const PAYMENT_CHANNELS = [
  "Cash",
  "PhonePe",
  "GooglePay",
  "PayTM",
  "BHIM UPI",
  "HDFC Bank",
  "SBI Bank",
  "ICICI Bank",
  "Axis Bank",
  "Net Banking",
  "Debit Card",
  "Credit Card",
  "Cheque",
  "Other",
];

const METAL_TYPES = ["OLD", "BULLION"];

// `types` limits a field to some purchase types; calc fields come from calcLine().
const ITEM_FIELDS = [
  { key: "itemId", label: "Item *", kind: "item" },
  { key: "categoryName", label: "Category", kind: "readonly" },
  { key: "productName", label: "Product", kind: "readonly" },
  { key: "metalName", label: "Metal", kind: "readonly" },
  { key: "purityName", label: "Purity", kind: "readonly" },
  { key: "gradeName", label: "Grade", kind: "readonly" },
  { key: "stoneId", label: "Stone", kind: "stone" },
  { key: "pieces", label: "Pcs", kind: "int" },
  { key: "grossWeight", label: "Gross Wt (g) *", kind: "number" },
  { key: "stoneWeight", label: "Stone Wt (g)", kind: "number" },
  { key: "netWeight", label: "Net Wt (g)", kind: "calc", weight: true },
  { key: "touchPercentage", label: "Touch %", kind: "number", types: METAL_TYPES },
  { key: "dustWeight", label: "Dust Wt (g)", kind: "number", types: METAL_TYPES },
  { key: "deductionWeight", label: "Deduction Wt (g)", kind: "number", types: METAL_TYPES },
  { key: "pureWeight", label: "Pure Wt (g)", kind: "calc", weight: true, types: METAL_TYPES },
  { key: "rate", label: "Rate (₹/g)", kind: "number" },
  { key: "metalAmount", label: "Metal Amt", kind: "calc", money: true },
  { key: "makingCharges", label: "Making (₹)", kind: "number", types: ["ORNAMENT"] },
  { key: "wastagePercentage", label: "Wastage %", kind: "number", types: ["ORNAMENT"] },
  { key: "hallmarkCharges", label: "Hallmark (₹)", kind: "number", types: ["ORNAMENT"] },
  { key: "stoneAmount", label: "Stone Amt", kind: "number" },
  { key: "otherAmount", label: "Other Amt", kind: "number" },
  { key: "discount", label: "Discount", kind: "number" },
  { key: "totalAmount", label: "Total", kind: "calc", money: true },
  { key: "hsnCode", label: "HSN/SAC", kind: "text" },
  { key: "huidNo", label: "HUID No.", kind: "text" },
  { key: "itemPhoto", label: "Photo", kind: "file" },
  { key: "narration", label: "Narration", kind: "text" },
];

// Values that only apply to some purchase types; cleared from the payload otherwise.
const TYPE_ONLY_KEYS = ["touchPercentage", "dustWeight", "deductionWeight", "makingCharges", "wastagePercentage", "hallmarkCharges"];

const fieldsForType = (purchaseType) =>
  ITEM_FIELDS.filter((f) => !f.types || f.types.includes(purchaseType));

const today = () => dayjs().format("YYYY-MM-DD");
const dateOnly = (value) => (value ? dayjs(value).format("YYYY-MM-DD") : "");
const toId = (value) => (value === undefined || value === null || value === "" ? "" : String(value));
const toField = (value) => (value === undefined || value === null ? "" : String(value));
const numOrZero = (value) => {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

function normalizeList(value) {
  if (Array.isArray(value)) return value;
  for (const key of ["data", "items", "purities", "grades", "stones", "products", "categories"]) {
    if (Array.isArray(value?.[key])) return value[key];
  }
  return [];
}

function normalizeDecimalInput(value = "") {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [wholeRaw, ...fraction] = cleaned.split(".");
  const whole = wholeRaw.replace(/^0+(?=\d)/, "") || "0";
  return fraction.length ? `${whole}.${fraction.join("")}` : whole;
}

const formatGrade = (grade) =>
  grade?.name ? `${grade.name}${grade.percentage ? ` (${grade.percentage}%)` : ""}` : "";

let rowCounter = 1;

function createRow() {
  return {
    key: `new-${rowCounter++}`,
    purchaseItemId: null,
    itemId: "",
    itemLabel: "",
    productId: "",
    metalId: "",
    purityId: "",
    gradeId: "",
    categoryName: "",
    productName: "",
    metalName: "",
    purityName: "",
    gradeName: "",
    stoneId: "",
    stones: [],
    pieces: "1",
    grossWeight: "",
    stoneWeight: "",
    touchPercentage: "",
    dustWeight: "",
    deductionWeight: "",
    rate: "",
    rateAuto: false,
    makingCharges: "",
    wastagePercentage: "",
    hallmarkCharges: "",
    stoneAmount: "",
    otherAmount: "",
    discount: "",
    hsnCode: "711319",
    huidNo: "",
    narration: "",
    itemPhoto: null,
    existingPhoto: null,
    extraDetails: undefined,
    barSerialNo: "",
    assayCertNo: "",
  };
}

function buildInitialForm(purchase) {
  const purchaseType = purchase?.purchaseType || "OLD";
  if (!purchase) {
    return {
      purchaseType,
      employeeId: "",
      partyId: "",
      customerName: "",
      customerPhone: "",
      customerIdType: "",
      customerIdNumber: "",
      address: "",
      placeOfSupply: "",
      applyGst: defaultApplyGst(purchaseType),
      isRCM: false,
      referenceNo: "",
      referenceDate: today(),
      date: today(),
      discount: "",
      narration: "",
      document: null,
    };
  }
  return {
    purchaseType,
    employeeId: toId(purchase.employeeId),
    partyId: toId(purchase.partyId),
    customerName: purchase.customerName || purchase.party?.name || "",
    customerPhone: purchase.customerPhone || "",
    customerIdType: purchase.customerIdType || "",
    customerIdNumber: purchase.customerIdNumber || "",
    address: purchase.address || "",
    placeOfSupply: purchase.placeOfSupply || "",
    applyGst: Number(purchase.taxAmount || 0) > 0,
    isRCM: Boolean(purchase.isRCM),
    referenceNo: purchase.referenceNo || "",
    referenceDate: dateOnly(purchase.referenceDate) || today(),
    date: dateOnly(purchase.date) || today(),
    discount: toField(purchase.discount || ""),
    narration: purchase.narration || "",
    document: null,
  };
}

/** Rows for an existing purchase, using the names the purchase already carries. */
function buildInitialItems(purchase) {
  const rawItems = purchase?.items || purchase?.purchaseItems;
  if (!Array.isArray(rawItems) || rawItems.length === 0) return [createRow()];

  return rawItems.map((it) => {
    const product = it.product || it.item?.product;
    const purity = it.purityMaster || product?.purity || it.item?.purity;
    return {
      ...createRow(),
      key: `item-${it.id}`,
      purchaseItemId: it.id ?? null,
      itemId: toId(it.itemId ?? it.item?.id),
      itemLabel: it.item?.name || "",
      productId: toId(it.productId ?? product?.id),
      metalId: toId(it.metalId ?? product?.metalId ?? it.metal?.id),
      purityId: toId(it.purityId ?? purity?.id),
      gradeId: toId(it.gradeId ?? product?.gradeId ?? it.grade?.id),
      categoryName: product?.category?.name || "",
      productName: product?.name || "",
      metalName: it.metal?.name || product?.metal?.name || "",
      purityName: purity?.name || "",
      gradeName: formatGrade(it.grade || product?.grade),
      stoneId: toId(it.stoneId ?? it.stone?.id),
      pieces: toField(Math.max(1, Number(it.pieces || 1))),
      grossWeight: toField(it.grossWeight),
      stoneWeight: toField(it.stoneWeight || ""),
      touchPercentage: toField(it.touchPercentage ?? ""),
      dustWeight: toField(it.dustWeight || ""),
      deductionWeight: toField(it.deductionWeight || ""),
      rate: toField(it.rate),
      makingCharges: toField(it.makingCharges || ""),
      wastagePercentage: toField(it.wastagePercentage || ""),
      hallmarkCharges: toField(it.hallmarkCharges || ""),
      stoneAmount: toField(it.stoneAmount || ""),
      otherAmount: toField(it.otherAmount || ""),
      discount: toField(it.discount || ""),
      hsnCode: toField(it.hsnCode) || "711319",
      huidNo: toField(it.huidNo),
      narration: toField(it.narration),
      existingPhoto: it.itemPhoto || null,
      extraDetails: it.extraDetails || undefined,
      barSerialNo: toField(it.barSerialNo),
      assayCertNo: toField(it.assayCertNo),
    };
  });
}

const emptyPayment = () => ({
  paymentMode: "CASH",
  paymentChannel: "Cash",
  amount: "",
  transactionId: "",
  referenceNo: "",
  description: "Direct Payment",
  paymentDate: today(),
  narration: "",
});

function splitInitialPayments(purchase) {
  const rows = Array.isArray(purchase?.payments) ? purchase.payments : [];
  const locked = rows.filter(isVoucherPayment);
  const direct = rows
    .filter((p) => !isVoucherPayment(p))
    .map((p) => ({
      paymentMode: p.paymentMode || "CASH",
      paymentChannel: p.paymentChannel || "Cash",
      amount: toField(Number(p.amount || 0)),
      transactionId: p.transactionId || p.referenceNo || "",
      referenceNo: p.referenceNo || p.transactionId || "",
      description: p.description || "",
      paymentDate: dateOnly(p.paymentDate) || today(),
      narration: p.narration || "",
    }));
  return { locked, direct: direct.length ? direct : [emptyPayment()] };
}

const buildLookups = ({ categories, grades, items }) => ({
  categories: new Map(categories.map((c) => [String(c.id), c.name])),
  grades: new Map(grades.map((g) => [String(g.id), g])),
  items: new Map(items.map((i) => [String(i.id), i])),
});

/** Fill the names an existing row does not carry from the item options. */
function hydrateRow(row, lookups) {
  const option = lookups.items.get(String(row.itemId));
  if (!option) return row;
  const next = { ...row, itemLabel: row.itemLabel || option.name };
  Object.entries(describeItem(option, lookups)).forEach(([k, v]) => {
    if (!next[k]) next[k] = v;
  });
  return next;
}

/** Product / metal / purity / grade details for a chosen item option. */
function describeItem(option, lookups) {
  const product = option?.product || null;
  const grade = lookups.grades.get(String(product?.gradeId ?? ""));
  return {
    productId: toId(option?.productId ?? product?.id),
    metalId: toId(product?.metalId ?? product?.metal?.id),
    purityId: toId(option?.purityId ?? product?.purityId ?? product?.purity?.id),
    gradeId: toId(product?.gradeId),
    categoryName: lookups.categories.get(String(product?.categoryId ?? "")) || "",
    productName: product?.name || "",
    metalName: product?.metal?.name || "",
    purityName: product?.purity?.name || option?.purity?.name || "",
    gradeName: formatGrade(grade),
  };
}

const itemOptionLabel = (o) => {
  const product = o.product?.name ? ` [${o.product.name}]` : "";
  const purity = o.product?.purity?.name ? ` - ${o.product.purity.name}` : "";
  return `${o.name}${product}${purity}`;
};

/** OLD gold is bought at the exchange rate; other purchases at the cash/sale rate. */
function rateFor(rates, row, purchaseType, date) {
  const match = pickLatestRate(rates, {
    metalId: row.metalId,
    purityId: row.purityId,
    gradeId: row.gradeId,
    date,
  });
  if (!match) return "";
  const value =
    purchaseType === "OLD"
      ? Number(match.exchangeRate || match.cashRate || 0)
      : Number(match.cashRate || match.saleRate || 0);
  return value > 0 ? String(value) : "";
}

export default function OldPurchaseForm({ open, setOpen, onSave, defaultValues }) {
  const isEdit = Boolean(defaultValues?.id);
  const legacy = isEdit && isLegacyPurchase(defaultValues);
  const selectedStore = useAuthStore((state) => state.selectedStore);

  const [form, setForm] = useState(() => buildInitialForm(defaultValues));
  const [items, setItems] = useState(() => buildInitialItems(defaultValues));
  const [{ locked: lockedPayments, direct: initialDirect }] = useState(() => splitInitialPayments(defaultValues));
  const [payments, setPayments] = useState(initialDirect);
  const [options, setOptions] = useState({
    employees: [],
    parties: [],
    stones: [],
    items: [],
    rates: [],
    categories: [],
    grades: [],
  });
  const [storeState, setStoreState] = useState(defaultValues?.store?.state || selectedStore?.state || null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Masters load once per dialog open (the page remounts this form on every open).
  useEffect(() => {
    let active = true;
    const warn = (label) => (error) => {
      notifyError(error, `Failed to load ${label}.`);
      return [];
    };
    Promise.all([
      getEmployees().catch(warn("employees")),
      getParties().catch(warn("parties")),
      getStones().catch(warn("stones")),
      getItemOptions().catch(warn("items")),
      getRates().catch(warn("rates")),
      getCategory().catch(() => []),
      getGrades().catch(() => []),
      resolveStoreState(getActiveStoreId(), defaultValues?.store || selectedStore),
    ]).then(([employees, parties, stones, itemOptions, rates, categories, grades, state]) => {
      if (!active) return;
      const loaded = {
        employees: normalizeList(employees),
        parties: normalizeList(parties),
        stones: normalizeList(stones),
        items: normalizeList(itemOptions),
        rates: normalizeList(rates),
        categories: normalizeList(categories),
        grades: normalizeList(grades),
      };
      const loadedLookups = buildLookups(loaded);
      setOptions(loaded);
      setItems((rows) => rows.map((row) => hydrateRow(row, loadedLookups)));
      if (state) setStoreState(state);
      setLoading(false);

      // stones of the rows the purchase already has
      buildInitialItems(defaultValues)
        .map((row) => hydrateRow(row, loadedLookups))
        .filter((row) => row.itemId && row.productId)
        .forEach((row) => {
          getStonesByProductAndItem(row.productId, row.itemId)
            .then((list) => {
              if (!active) return;
              setItems((rows) =>
                rows.map((r) => (r.key === row.key ? { ...r, stones: normalizeList(list) } : r))
              );
            })
            .catch(() => {});
        });
    });
    return () => {
      active = false;
    };
  }, [defaultValues, selectedStore]);

  const lookups = useMemo(() => buildLookups(options), [options]);


  const itemSelectOptions = useMemo(() => {
    const list = options.items.map((o) => ({ value: String(o.id), label: itemOptionLabel(o) }));
    // Keep the label of an item that is no longer in the master (edit of an old purchase).
    items.forEach((row) => {
      if (row.itemId && !lookups.items.has(String(row.itemId))) {
        list.push({ value: String(row.itemId), label: row.itemLabel || `Item #${row.itemId}` });
      }
    });
    return list;
  }, [options.items, items, lookups.items]);

  const clearError = (field) => {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    clearError(field);
  };

  // Re-price rows whose rate was auto-filled when the type or date changes.
  const refreshAutoRates = (purchaseType, date) => {
    setItems((rows) =>
      rows.map((row) =>
        row.rateAuto || !row.rate
          ? { ...row, rate: rateFor(options.rates, row, purchaseType, date), rateAuto: true }
          : row
      )
    );
  };

  const changePurchaseType = (purchaseType) => {
    setForm((prev) => ({ ...prev, purchaseType, applyGst: defaultApplyGst(purchaseType) }));
    refreshAutoRates(purchaseType, form.date);
    clearError("customerPhone");
  };

  const changeDate = (date) => {
    updateForm("date", date);
    if (date) refreshAutoRates(form.purchaseType, date);
  };

  const handlePartyChange = (partyId) => {
    setErrors((prev) => ({ ...prev, customerName: null, customerPhone: null }));
    if (!partyId) {
      setForm((prev) => ({ ...prev, partyId: "" }));
      return;
    }
    const party = options.parties.find((p) => String(p.id) === String(partyId));
    setForm((prev) => ({
      ...prev,
      partyId,
      customerName: party?.name || prev.customerName,
      customerPhone: party?.phone ? onlyDigits(party.phone).slice(-10) : prev.customerPhone,
      address: party?.address || prev.address,
      placeOfSupply: party?.state || prev.placeOfSupply,
    }));
  };

  const addRow = () => setItems((prev) => [...prev, createRow()]);
  const deleteRow = (key) =>
    setItems((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));

  const updateRow = (key, field, value) => {
    setErrors((prev) => ({ ...prev, items: null }));
    setItems((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row;
        const next = { ...row, [field]: value };
        if (field === "rate") next.rateAuto = false;
        if (field !== "itemId") return next;

        const option = lookups.items.get(String(value));
        Object.assign(next, describeItem(option, lookups), {
          itemLabel: option?.name || "",
          stoneId: "",
          stones: [],
        });
        if (!row.rate || row.rateAuto) {
          next.rate = rateFor(options.rates, next, form.purchaseType, form.date);
          next.rateAuto = true;
        }
        if (option && next.productId) {
          getStonesByProductAndItem(next.productId, value)
            .then((stones) =>
              setItems((rows) =>
                rows.map((r) => (r.key === key && r.itemId === value ? { ...r, stones: normalizeList(stones) } : r))
              )
            )
            .catch(() => {});
        }
        return next;
      })
    );
  };

  const addPaymentRow = () => setPayments((prev) => [...prev, emptyPayment()]);
  const removePaymentRow = (idx) =>
    setPayments((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : [emptyPayment()]));
  const updatePaymentRow = (idx, field, val) => {
    clearError("payments");
    setPayments((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));
  };

  const visibleFields = fieldsForType(form.purchaseType);
  const visibleKeys = new Set(visibleFields.map((f) => f.key));
  const lines = items.map((row) =>
    calcLine({
      ...row,
      ...Object.fromEntries(TYPE_ONLY_KEYS.filter((k) => !visibleKeys.has(k)).map((k) => [k, ""])),
    })
  );

  const effectiveState = storeState || DEFAULT_STORE_STATE;
  const totals = calcTotals({
    lines,
    discount: form.discount,
    applyGst: form.applyGst,
    isRCM: form.isRCM,
    placeOfSupply: form.placeOfSupply,
    storeState: effectiveState,
  });
  const isInter = totals.gstType === "INTER";

  const totalPieces = items.reduce((s, r) => s + Math.max(1, parseInt(r.pieces, 10) || 1), 0);
  const totalGross = lines.reduce((s, l) => s + l.grossWeight, 0);
  const totalNet = lines.reduce((s, l) => s + l.netWeight, 0);
  const totalPure = lines.reduce((s, l) => s + l.pureWeight, 0);
  const lockedPaid = roundMoney(lockedPayments.reduce((s, p) => s + Number(p.amount || 0), 0));
  const directPaid = roundMoney(payments.reduce((s, p) => s + numOrZero(p.amount), 0));
  const paidAmount = roundMoney(lockedPaid + directPaid);
  const dueAmount = roundMoney(Math.max(0, totals.netPayable - paidAmount));
  const amountWords = numberToWordsIndian(totals.netPayable);

  const syncPaymentAmount = () => {
    const remaining = roundMoney(Math.max(0, totals.netPayable - lockedPaid));
    setPayments((prev) => [
      {
        ...(prev[0] || emptyPayment()),
        amount: String(remaining),
        description: "Full Purchase Settlement",
      },
      ...prev.slice(1).map((p) => ({ ...p, amount: "" })),
    ]);
    clearError("payments");
  };

  const selectCls =
    "h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60";

  const renderCell = (row, field, line) => {
    if (field.kind === "calc") {
      const value = line[field.key] || 0;
      return (
        <div className="h-9 w-full rounded-md border border-slate-200 bg-slate-50 px-3 flex items-center text-sm font-semibold text-slate-800">
          {field.money ? "₹" : ""}
          {Number(value).toFixed(field.money ? 2 : 3)}
        </div>
      );
    }

    if (field.kind === "readonly") {
      const tone =
        field.key === "purityName"
          ? "bg-amber-50 border-amber-200 text-amber-900"
          : field.key === "gradeName"
          ? "bg-emerald-50 border-emerald-200 text-emerald-900"
          : "bg-slate-50 border-slate-200 text-slate-700";
      return (
        <div
          className={`h-9 w-full rounded-md border px-3 flex items-center text-sm font-medium overflow-hidden text-ellipsis whitespace-nowrap ${tone}`}
          title={row[field.key] || "-"}
        >
          {row[field.key] || "-"}
        </div>
      );
    }

    if (field.kind === "item") {
      return (
        <Select
          showSearch={{ optionFilterProp: "label" }}
          allowClear
          className="w-full"
          style={{ height: 36 }}
          placeholder={loading ? "Loading items..." : "Search item"}
          loading={loading}
          disabled={legacy}
          value={row.itemId || undefined}
          options={itemSelectOptions}
          onChange={(value) => updateRow(row.key, "itemId", value ? String(value) : "")}
          getPopupContainer={(trigger) => trigger.parentElement}
          notFoundContent={loading ? "Loading..." : "No matching item"}
        />
      );
    }

    if (field.kind === "stone") {
      const list = row.stones.length ? row.stones : [];
      return (
        <select
          className={selectCls}
          value={row.stoneId}
          disabled={legacy}
          onChange={(e) => updateRow(row.key, "stoneId", e.target.value)}
        >
          <option value="">{list.length ? "Select Stone" : "No stone"}</option>
          {list.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      );
    }

    if (field.kind === "file") {
      return (
        <div className="space-y-1">
          <Input
            type="file"
            accept="image/*"
            disabled={legacy}
            onChange={(e) => updateRow(row.key, "itemPhoto", e.target.files?.[0] ?? null)}
          />
          {row.existingPhoto && !row.itemPhoto ? (
            <a href={row.existingPhoto} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 underline">
              Current photo
            </a>
          ) : null}
        </div>
      );
    }

    const numeric = field.kind === "number" || field.kind === "int";
    return (
      <Input
        type="text"
        inputMode={numeric ? "decimal" : undefined}
        disabled={legacy}
        value={row[field.key]}
        onChange={(e) => {
          const raw = e.target.value;
          const value = field.kind === "int" ? onlyDigits(raw) : numeric ? normalizeDecimalInput(raw) : raw;
          updateRow(row.key, field.key, value);
        }}
      />
    );
  };

  const validate = () => {
    const next = {};
    const customerName = form.customerName.trim();
    const customerPhone = String(form.customerPhone || "").trim();

    if (!form.employeeId) next.employeeId = "Employee is required.";
    if (!form.partyId && !customerName) next.customerName = "Customer name or Party is required.";
    if (customerPhone && !/^\d{10}$/.test(customerPhone)) {
      next.customerPhone = "Phone must be exactly 10 digits.";
    } else if (form.purchaseType === "OLD" && !form.partyId && !customerPhone) {
      next.customerPhone = "A 10-digit phone is required for a walk-in old gold purchase.";
    }
    if (form.customerIdType && !form.customerIdNumber.trim()) {
      next.customerIdNumber = "ID number is required when ID type is selected.";
    }
    if (!form.date) next.date = "Date is required.";

    if (!legacy) {
      const rowProblems = items.flatMap((row, i) => lineErrors(row, i));
      if (rowProblems.length) next.items = rowProblems;
      if (numOrZero(form.discount) > totals.grossAmount + 0.001) {
        next.discount = "Discount cannot be more than the purchase value.";
      }
      if (paidAmount > totals.netPayable + 0.01) {
        next.payments = "Paid amount cannot exceed the total amount.";
      }
    }
    return next;
  };

  const buildPayload = () => {
    const details = {
      employeeId: form.employeeId ? Number(form.employeeId) : null,
      date: form.date,
      referenceNo: form.referenceNo.trim(),
      referenceDate: form.referenceDate || null,
      address: form.address,
      customerName: form.customerName.trim(),
      customerPhone: String(form.customerPhone || "").trim(),
      customerIdType: form.customerIdType,
      customerIdNumber: form.customerIdNumber.trim(),
      narration: form.narration,
    };
    // Migrated purchases: the server rejects any change to items, amounts or payments.
    if (legacy) return { payload: details, photos: [] };

    const photos = [];
    const payloadItems = items.map((row) => {
      const typeOnly = Object.fromEntries(
        TYPE_ONLY_KEYS.map((k) => [k, visibleKeys.has(k) && row[k] !== "" ? Number(row[k]) : k === "touchPercentage" ? null : 0])
      );
      const line = calcLine({ ...row, ...typeOnly });
      const out = {
        purchaseItemId: row.purchaseItemId || undefined,
        itemId: row.itemId ? Number(row.itemId) : null,
        productId: row.productId ? Number(row.productId) : null,
        metalId: row.metalId ? Number(row.metalId) : null,
        purityId: row.purityId ? Number(row.purityId) : null,
        gradeId: row.gradeId ? Number(row.gradeId) : null,
        stoneId: row.stoneId ? Number(row.stoneId) : null,
        pieces: Math.max(1, parseInt(row.pieces, 10) || 1),
        grossWeight: line.grossWeight,
        stoneWeight: line.stoneWeight,
        netWeight: line.netWeight,
        pureWeight: line.pureWeight,
        ...typeOnly,
        rate: numOrZero(row.rate),
        metalAmount: line.metalAmount,
        stoneAmount: numOrZero(row.stoneAmount),
        otherAmount: numOrZero(row.otherAmount),
        discount: numOrZero(row.discount),
        totalAmount: line.totalAmount,
        hsnCode: row.hsnCode || "711319",
        huidNo: row.huidNo || null,
        barSerialNo: row.barSerialNo || null,
        assayCertNo: row.assayCertNo || null,
        narration: row.narration || null,
        // keep the stored photo unless a new file replaces it
        itemPhoto: row.itemPhoto ? null : row.existingPhoto || null,
        extraDetails: row.extraDetails,
      };
      if (row.itemPhoto) {
        out.photoIndex = photos.length;
        photos.push(row.itemPhoto);
      }
      return out;
    });

    const payload = {
      ...details,
      purchaseType: form.purchaseType,
      partyId: form.partyId ? Number(form.partyId) : null,
      placeOfSupply: form.placeOfSupply.trim(),
      applyGst: form.applyGst,
      isRCM: form.isRCM,
      discount: totals.discount,
      // informational only — the server recomputes every amount below
      grossAmount: totals.grossAmount,
      taxableAmount: totals.taxableAmount,
      cgst: totals.cgst,
      sgst: totals.sgst,
      igst: totals.igst,
      taxAmount: totals.taxAmount,
      roundOff: totals.roundOff,
      netPayable: totals.netPayable,
      paymentMode: payments[0]?.paymentMode || "CASH",
      payments: payments
        .filter((p) => numOrZero(p.amount) > 0)
        .map((p) => ({
          paymentMode: p.paymentMode,
          paymentChannel: p.paymentChannel,
          amount: roundMoney(numOrZero(p.amount)),
          transactionId: p.transactionId || p.referenceNo,
          referenceNo: p.referenceNo || p.transactionId,
          description: p.description,
          paymentDate: p.paymentDate,
          narration: p.narration,
        })),
      items: payloadItems,
    };
    return { payload, photos };
  };

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    const { payload, photos } = buildPayload();
    const fd = new FormData();
    fd.append("data", JSON.stringify(payload));
    if (form.document) fd.append("document", form.document);
    photos.forEach((file) => fd.append("itemPhotos", file));

    setSaving(true);
    try {
      // the page closes the dialog only when the save succeeds
      await onSave?.(fd);
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key) =>
    errors[key] ? <p className="text-xs text-red-500">{errors[key]}</p> : null;

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogContent className="!w-[95vw] !max-w-[1400px] h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? `Edit Purchase ${defaultValues.invoiceNo || ""}` : "New Purchase"}
          </DialogTitle>
        </DialogHeader>

        {legacy ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This is a migrated purchase. Only details (customer, reference, address, KYC, narration) can be
            edited; items, amounts and payments are locked.
          </div>
        ) : null}

        <div className="border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Purchase Type</label>
              <select
                className={selectCls}
                value={form.purchaseType}
                disabled={legacy}
                onChange={(e) => changePurchaseType(e.target.value)}
              >
                {PURCHASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Employee <span className="text-destructive">*</span>
              </label>
              <select className={selectCls} value={form.employeeId} onChange={(e) => updateForm("employeeId", e.target.value)}>
                <option value="">Select Employee</option>
                {options.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              {fieldError("employeeId")}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Reference No.</label>
              <Input
                value={form.referenceNo}
                onChange={(e) => updateForm("referenceNo", onlyAlphaNumeric(e.target.value))}
                placeholder="Reference No."
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Purchase Invoice Date</label>
              <Input type="date" value={form.date} onChange={(e) => changeDate(e.target.value)} />
              {fieldError("date")}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Party / Customer Master</label>
              <select
                className={selectCls}
                value={form.partyId}
                disabled={legacy}
                onChange={(e) => handlePartyChange(e.target.value)}
              >
                <option value="">-- Walk-in / New Customer --</option>
                {options.parties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.phone ? `(${p.phone})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Customer Name <span className="text-destructive">*</span>
              </label>
              <Input value={form.customerName} onChange={(e) => updateForm("customerName", e.target.value)} placeholder="Customer name" />
              {fieldError("customerName")}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Phone
                {form.purchaseType === "OLD" && !form.partyId ? <span className="text-destructive"> *</span> : null}
              </label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="10-digit mobile"
                value={form.customerPhone}
                onChange={(e) => updateForm("customerPhone", onlyDigits(e.target.value).slice(0, 10))}
              />
              {fieldError("customerPhone")}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ID Type</label>
              <select className={selectCls} value={form.customerIdType} onChange={(e) => updateForm("customerIdType", e.target.value)}>
                <option value="">Select</option>
                {CUSTOMER_ID_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">ID Number</label>
              <Input
                value={form.customerIdNumber}
                onChange={(e) => updateForm("customerIdNumber", onlyAlphaNumeric(e.target.value))}
                placeholder="ID Number"
              />
              {fieldError("customerIdNumber")}
            </div>
            <div className="space-y-1 col-span-2">
              <label className="text-xs text-muted-foreground">Address</label>
              <Input value={form.address} onChange={(e) => updateForm("address", e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Place of Supply (state)</label>
              <Input
                value={form.placeOfSupply}
                disabled={legacy}
                placeholder={`Blank = store state (${effectiveState})`}
                onChange={(e) => updateForm("placeOfSupply", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.applyGst}
                disabled={legacy}
                onChange={(e) => updateForm("applyGst", e.target.checked)}
              />
              Charge GST (3%)
              <span className="text-xs text-muted-foreground">
                {form.purchaseType === "OLD" ? "(URD default: off)" : "(default: on)"}
              </span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={form.isRCM}
                disabled={legacy || !form.applyGst}
                onChange={(e) => updateForm("isRCM", e.target.checked)}
              />
              Reverse charge (RCM)
              <span className="text-xs text-muted-foreground">tax not paid to seller</span>
            </label>
            <div className="text-xs text-muted-foreground">
              Store state: <span className="font-medium text-slate-700">{effectiveState}</span> ·{" "}
              {isInter ? "Inter-state (IGST)" : "Intra-state (CGST + SGST)"}
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Document</label>
              <Input type="file" onChange={(e) => updateForm("document", e.target.files?.[0] ?? null)} />
              {defaultValues?.document && !form.document ? (
                <button
                  type="button"
                  onClick={() => openStoredFile(defaultValues.document).catch((error) => notifyError(error, "Could not open the document."))}
                  className="text-[11px] text-blue-600 underline"
                >
                  Current document
                </button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="border rounded-lg mt-2">
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <h2 className="font-medium text-sm">
              Items <span className="text-xs text-muted-foreground">({form.purchaseType})</span>
            </h2>
            <Button size="sm" onClick={addRow} disabled={loading || legacy}>
              + Add
            </Button>
          </div>

          {errors.items?.length ? (
            <div className="mx-4 mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600 space-y-0.5">
              {errors.items.map((msg) => (
                <div key={msg}>{msg}</div>
              ))}
            </div>
          ) : null}

          <div className="space-y-4 p-4">
            {items.map((row, index) => (
              <div key={row.key} className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Item {index + 1}</h3>
                  {items.length > 1 && !legacy ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 px-2 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteRow(row.key)}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {visibleFields.map((f) => (
                    <div key={f.key} className="space-y-1 relative">
                      <label className="text-xs text-muted-foreground">{f.label}</label>
                      {renderCell(row, f, lines[index])}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">Payment Details</h3>
              {!legacy ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" type="button" onClick={syncPaymentAmount} className="h-7 text-xs">
                    Pay Full Balance
                  </Button>
                  <Button size="sm" variant="outline" type="button" onClick={addPaymentRow} className="h-7 text-xs">
                    + Add Mode
                  </Button>
                </div>
              ) : null}
            </div>

            {lockedPayments.length ? (
              <div className="space-y-1 rounded border border-slate-200 bg-slate-50 p-2">
                <div className="text-[11px] font-semibold text-slate-600">
                  Payments from vouchers (read-only — cancel the voucher in Accounts to change)
                </div>
                {lockedPayments.map((p) => (
                  <div key={p.id || p.referenceNo} className="flex justify-between text-xs text-slate-700">
                    <span>
                      {p.referenceNo || "Voucher"} · {p.paymentMode} · {dateOnly(p.paymentDate)}
                    </span>
                    <span className="font-semibold">₹{Number(p.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {!legacy ? (
              <div className="space-y-2">
                {payments.map((pmt, idx) => (
                  <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold block">Mode</label>
                      <select className={selectCls} value={pmt.paymentMode} onChange={(e) => updatePaymentRow(idx, "paymentMode", e.target.value)}>
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold block">Channel</label>
                      <select className={selectCls} value={pmt.paymentChannel} onChange={(e) => updatePaymentRow(idx, "paymentChannel", e.target.value)}>
                        {PAYMENT_CHANNELS.map((ch) => (
                          <option key={ch} value={ch}>
                            {ch}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold block">Amount (₹)</label>
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="Amount"
                        value={pmt.amount}
                        onChange={(e) => updatePaymentRow(idx, "amount", normalizeDecimalInput(e.target.value))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-500 font-semibold block">Ref / Tr. ID</label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="Txn / Ref No."
                          value={pmt.transactionId}
                          onChange={(e) => updatePaymentRow(idx, "transactionId", e.target.value)}
                        />
                        {payments.length > 1 ? (
                          <Button size="sm" variant="ghost" type="button" onClick={() => removePaymentRow(idx)} className="h-9 px-2 text-destructive">
                            ×
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="Invoice discount"
                  disabled={legacy}
                  value={form.discount}
                  onChange={(e) => updateForm("discount", normalizeDecimalInput(e.target.value))}
                />
                {fieldError("discount")}
              </div>
              <Input placeholder="Narration" value={form.narration} onChange={(e) => updateForm("narration", e.target.value)} />
            </div>
          </div>

          <div className="border rounded-lg p-4 space-y-1">
            {[
              { label: "Total Gross Wt", value: `${totalGross.toFixed(3)} gm` },
              { label: "Total Net Wt", value: `${totalNet.toFixed(3)} gm` },
              ...(METAL_TYPES.includes(form.purchaseType)
                ? [{ label: "Total Pure Wt", value: `${totalPure.toFixed(3)} gm` }]
                : []),
              { label: "Total Pieces (Pcs)", value: `${totalPieces}` },
              { label: "Gross Item Amount", value: `₹${totals.grossAmount.toFixed(2)}` },
              { label: "Discount", value: `₹${totals.discount.toFixed(2)}` },
              { label: "Taxable Amount", value: `₹${totals.taxableAmount.toFixed(2)}` },
              ...(isInter
                ? [{ label: "IGST (3%)", value: `₹${totals.igst.toFixed(2)}` }]
                : [
                    { label: "CGST (1.5%)", value: `₹${totals.cgst.toFixed(2)}` },
                    { label: "SGST (1.5%)", value: `₹${totals.sgst.toFixed(2)}` },
                  ]),
              ...(totals.rcm ? [{ label: "GST under RCM (not payable to seller)", value: `₹${totals.taxAmount.toFixed(2)}` }] : []),
              { label: "Round Off", value: `₹${totals.roundOff.toFixed(2)}` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm py-1">
                <span className="text-muted-foreground">{label}</span>
                <span>{value}</span>
              </div>
            ))}
            <div className="flex justify-between font-semibold text-sm border-t pt-2 mt-1">
              <span>Net Payable</span>
              <span>₹{totals.netPayable.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-green-600 font-medium">
              <span>Paid Amount</span>
              <span>₹{paidAmount.toFixed(2)}</span>
            </div>
            {dueAmount > 0.01 ? (
              <div className="flex justify-between text-sm text-amber-700 font-bold bg-amber-50 px-2 py-1 rounded">
                <span>{form.purchaseType === "OLD" ? "Payable to Customer" : "Supplier Pending Due"}</span>
                <span>₹{dueAmount.toFixed(2)}</span>
              </div>
            ) : null}
            {errors.payments ? (
              <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">
                {errors.payments}
              </div>
            ) : null}
            <div className="pt-2 border-t mt-2 text-xs">
              <span className="font-bold">Invoice Value [ In Words ] : </span>
              <span className="italic">{amountWords}</span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Amounts are recalculated by the server when you save.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
