import dayjs from "dayjs";

// Preview-only maths. The server recomputes GST, weights and round-off (CONTRACT.md §3); these
// functions mirror its rules so the cashier sees the same numbers before saving.

export const roundMoney = (val) => Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;
export const money = (val) => roundMoney(val).toFixed(2);
export const weightStr = (val) => Number(val || 0).toFixed(3);

export const GST_RATES = { INTRA: { cgst: 1.5, sgst: 1.5, igst: 0 }, INTER: { cgst: 0, sgst: 0, igst: 3 } };
export const MAX_ROUND_OFF = 0.99;

const nonNegative = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export const normalizeState = (s) => String(s || "").trim().toUpperCase();

/** INTER when place of supply differs from the store's state; INTRA otherwise (or when unknown). */
export const gstTypeFor = (placeOfSupply, storeState) => {
  const pos = normalizeState(placeOfSupply);
  const home = normalizeState(storeState);
  if (!pos || !home) return "INTRA";
  return pos === home ? "INTRA" : "INTER";
};

export const normalizeMakingType = (type) => {
  const t = String(type || "").trim().toUpperCase();
  if (t === "PERCENT" || t === "PERCENTAGE" || t === "%") return "PERCENT";
  if (t === "PER_GRAM" || t === "PERGRAM" || t === "PER_GM" || t === "GRAM") return "PER_GRAM";
  if (t === "FLAT" || t === "AMOUNT" || t === "FIXED" || t === "LUMPSUM") return "FLAT";
  return "PERCENT";
};

/** Recomputes the money columns of one bill line. Weights come from the inventory and are not edited. */
export const computeLine = (line) => {
  const quantity = Math.max(1, Number(line.pieces || 1));
  const stockPieces = Math.max(1, Number(line.stockPieces || quantity));
  const ratio = quantity / stockPieces;
  const grossWeight = roundMoney(nonNegative(line.stockGrossWeight ?? line.grossWeight) * ratio);
  const stoneWeight = roundMoney(nonNegative(line.stockStoneWeight ?? line.stoneWeight) * ratio);
  const netWeight = roundMoney(nonNegative(line.stockNetWeight ?? line.netWeight) * ratio);
  const rate = nonNegative(line.rate);
  const metalAmount = roundMoney(quantity * rate);
  const makingChargeType = normalizeMakingType(line.makingChargeType);
  const makingChargeRate = nonNegative(line.makingChargeRate);
  let makingCharges;
  if (makingChargeType === "PERCENT") makingCharges = roundMoney((metalAmount * makingChargeRate) / 100);
  else if (makingChargeType === "PER_GRAM") makingCharges = roundMoney(netWeight * makingChargeRate);
  // FLAT: the rate box holds the making amount itself (same as the server's else-branch).
  else makingCharges = roundMoney(makingChargeRate * quantity);
  const stoneAmount = roundMoney(nonNegative(line.stoneAmount));
  const otherCharges = roundMoney(nonNegative(line.otherCharges));
  const gross = metalAmount + makingCharges + stoneAmount + otherCharges;
  const discount = Math.min(roundMoney(nonNegative(line.discount)), roundMoney(gross));
  return {
    ...line,
    pieces: quantity,
    grossWeight,
    stoneWeight,
    netWeight,
    makingChargeType,
    metalAmount,
    makingCharges,
    totalAmount: roundMoney(gross - discount),
  };
};

/** Maps GET /api/barcode/scan billingLine into a bill line (all fields filled from the server). */
export const lineFromBillingLine = (billingLine, scan = {}) => {
  const bl = billingLine || {};
  const inv = scan.inventory || {};
  return computeLine({
    inventoryId: bl.inventoryId ?? inv.id,
    particulars: bl.particulars || bl.itemName || bl.productName || inv.inventoryCode || "Item",
    itemCode: bl.itemCode || inv.barcodeNo || inv.tagNo || inv.inventoryCode || "",
    barcodeNo: inv.barcodeNo || "",
    tagNo: inv.tagNo || "",
    huidNo: bl.huidNo || "",
    hsnCode: bl.hsnCode || "",
    purityName: bl.purityName || (bl.purity ? `${bl.purity}` : ""),
    purity: bl.purity ?? null,
    metalName: bl.metalName || "",
    pieces: 1,
    stockPieces: Number(inv.pieces || bl.pieces) || 1,
    availablePieces: Number(inv.availablePieces || bl.availablePieces || bl.pieces) || 1,
    stockGrossWeight: Number(bl.grossWeight) || 0,
    stockStoneWeight: Number(bl.stoneWeight) || 0,
    stockNetWeight: Number(bl.netWeight) || 0,
    rate: Number(bl.rate) || 0,
    rateSource: bl.rateSource || (Number(bl.rate) > 0 ? "RATE_MASTER" : "NONE"),
    makingChargeType: normalizeMakingType(bl.makingChargeType),
    makingChargeRate: Number(bl.makingChargeRate) || 0,
    stoneAmount: (Number(bl.stoneAmount) || 0) / Math.max(1, Number(inv.pieces || bl.pieces) || 1),
    otherCharges: (Number(bl.otherCharges) || 0) / Math.max(1, Number(inv.pieces || bl.pieces) || 1),
    discount: 0,
  });
};

const sumSelected = (selection) =>
  roundMoney(
    Object.values(selection || {}).reduce((s, x) => (x?.isSelected ? s + nonNegative(x.adjustedAmount) : s), 0)
  );

/**
 * @param {object} state         sale form state
 * @param {object} ctx           { storeState, advanceSel, oldGoldSel }
 */
export const computeTotals = (state, { storeState, advanceSel, oldGoldSel }) => {
  const items = state.items || [];
  const gstType = gstTypeFor(state.placeOfSupply, storeState);
  const rates = GST_RATES[gstType];

  const totalGrossWeight = items.reduce((s, it) => s + Number(it.grossWeight || 0), 0);
  const totalNetWeight = items.reduce((s, it) => s + Number(it.netWeight || 0), 0);
  const grossAmount = roundMoney(items.reduce((s, it) => s + Number(it.totalAmount || 0), 0));

  const offerDiscount = roundMoney(nonNegative(state.offerDiscount));
  const discount = roundMoney(nonNegative(state.discount));
  const taxableAmount = roundMoney(Math.max(0, grossAmount - offerDiscount - discount));

  const cgstAmount = roundMoney((taxableAmount * rates.cgst) / 100);
  const sgstAmount = roundMoney((taxableAmount * rates.sgst) / 100);
  const igstAmount = roundMoney((taxableAmount * rates.igst) / 100);
  const totalTax = roundMoney(cgstAmount + sgstAmount + igstAmount);
  const subTotal = roundMoney(taxableAmount + totalTax);

  const totalAdvanceAdjusted = sumSelected(advanceSel);
  const totalOldGoldAdjusted = sumSelected(oldGoldSel);
  const lessUrd = roundMoney(nonNegative(state.lessUrd));
  const totalAdjustments = roundMoney(totalAdvanceAdjusted + totalOldGoldAdjusted + lessUrd);
  const deductionsExceed = totalAdjustments > subTotal + 0.01;

  const unroundedNet = roundMoney(Math.max(0, subTotal - totalAdjustments));
  const autoRoundOff = roundMoney(Math.round(unroundedNet) - unroundedNet);

  // A manual round-off only applies to the amount it was typed against; any change to the bill
  // (items, discounts, deductions) brings back the automatic value.
  const manual = state.manualRoundOff;
  const manualValid =
    manual && manual.basis === unroundedNet && manual.value !== "" && Number.isFinite(Number(manual.value));
  const manualValue = manualValid ? roundMoney(Number(manual.value)) : null;
  const roundOffError =
    manualValue !== null && Math.abs(manualValue) > MAX_ROUND_OFF ? `Round off must be between -${MAX_ROUND_OFF} and ${MAX_ROUND_OFF}.` : null;
  const roundOff = manualValue !== null && !roundOffError ? manualValue : autoRoundOff;
  const isManualRoundOff = manualValue !== null && !roundOffError;

  const netPayable = roundMoney(Math.max(0, unroundedNet + roundOff));
  const paidAmount = roundMoney((state.payments || []).reduce((s, p) => s + nonNegative(p.amount), 0));
  const dueAmount = roundMoney(Math.max(0, netPayable - paidAmount));

  return {
    gstType,
    isInterState: gstType === "INTER",
    cgstPercent: rates.cgst,
    sgstPercent: rates.sgst,
    igstPercent: rates.igst,
    totalGrossWeight,
    totalNetWeight,
    grossAmount,
    offerDiscount,
    discount,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTax,
    subTotal,
    totalAdvanceAdjusted,
    totalOldGoldAdjusted,
    lessUrd,
    totalAdjustments,
    deductionsExceed,
    unroundedNet,
    autoRoundOff,
    roundOff,
    roundOffError,
    isManualRoundOff,
    netPayable,
    paidAmount,
    dueAmount,
  };
};

/** Largest amount one deduction may take without pushing the total deductions above the invoice value. */
export const maxDeductionFor = ({ balance, subTotal, otherDeductions }) =>
  roundMoney(Math.max(0, Math.min(nonNegative(balance), roundMoney(subTotal - otherDeductions))));

export const todayLocal = () => dayjs().format("YYYY-MM-DD");

/** Sale timestamp: now for today, otherwise the chosen local day at the current clock time. */
export const saleTimestamp = (dateStr) => {
  const now = dayjs();
  if (!dateStr || dateStr === now.format("YYYY-MM-DD")) return now.toISOString();
  const day = dayjs(dateStr);
  if (!day.isValid()) return now.toISOString();
  return day.hour(now.hour()).minute(now.minute()).second(now.second()).toISOString();
};
