// Client-side preview of the purchase valuation. The server recomputes everything
// (weights, line totals, GST, round-off, paid/due); this mirrors that math so the
// figures on screen match what gets saved.

export const DEFAULT_STORE_STATE = "ODISHA";
export const GST_RATE = { CGST: 1.5, SGST: 1.5, IGST: 3 };

export const roundMoney = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 100) / 100;
export const roundWeight = (v) => Math.round((Number(v || 0) + Number.EPSILON) * 1000) / 1000;

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const normaliseState = (s) => String(s || "").toUpperCase().replace(/[^A-Z]/g, "");

/** True when the place of supply is a different state from the store (IGST applies). */
export const isInterState = (placeOfSupply, storeState) => {
  const pos = normaliseState(placeOfSupply);
  if (!pos) return false;
  const own = normaliseState(storeState) || DEFAULT_STORE_STATE;
  return !(pos === own || pos.includes(own) || own.includes(pos));
};

/** OLD (URD) purchases carry no GST by default; ORNAMENT/BULLION carry 3%. */
export const defaultApplyGst = (purchaseType) => purchaseType !== "OLD";

/** Weights and amounts for one line, the same way the server values it. */
export const calcLine = (row) => {
  const grossWeight = roundWeight(num(row.grossWeight));
  const stoneWeight = roundWeight(num(row.stoneWeight));
  const netWeight = roundWeight(Math.max(0, grossWeight - stoneWeight));
  const touch = num(row.touchPercentage);
  const pureWeight = touch > 0 ? roundWeight((netWeight * touch) / 100) : 0;

  const rate = num(row.rate);
  const metalAmount = roundMoney(netWeight * rate);
  const totalAmount = roundMoney(
    metalAmount +
      num(row.makingCharges) +
      num(row.hallmarkCharges) +
      num(row.stoneAmount) +
      num(row.otherAmount) -
      num(row.discount)
  );

  return { grossWeight, stoneWeight, netWeight, pureWeight, metalAmount, totalAmount };
};

/** Line-level problems the server would reject, as "Row n: ..." messages. */
export const lineErrors = (row, index) => {
  const label = `Row ${index + 1}`;
  const out = [];
  const gross = num(row.grossWeight);
  if (!row.itemId) out.push(`${label}: select an item.`);
  if (gross <= 0) out.push(`${label}: gross weight must be greater than zero.`);
  if (num(row.stoneWeight) > gross) out.push(`${label}: stone weight cannot be more than the gross weight.`);
  if (num(row.touchPercentage) > 100) out.push(`${label}: touch % cannot be more than 100.`);
  if (num(row.wastagePercentage) > 100) out.push(`${label}: wastage % cannot be more than 100.`);
  if (calcLine(row).totalAmount < 0) out.push(`${label}: discount cannot be more than the line value.`);
  return out;
};

/** Header totals: discount, GST split by store state vs place of supply, RCM, round-off. */
export const calcTotals = ({ lines, discount, applyGst, isRCM, placeOfSupply, storeState }) => {
  const grossAmount = roundMoney(lines.reduce((s, l) => s + l.totalAmount, 0));
  const invoiceDiscount = roundMoney(num(discount));
  const taxableAmount = roundMoney(Math.max(0, grossAmount - invoiceDiscount));
  const inter = isInterState(placeOfSupply, storeState);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  if (applyGst && taxableAmount > 0) {
    if (inter) igst = roundMoney((taxableAmount * GST_RATE.IGST) / 100);
    else {
      cgst = roundMoney((taxableAmount * GST_RATE.CGST) / 100);
      sgst = roundMoney((taxableAmount * GST_RATE.SGST) / 100);
    }
  }
  const taxAmount = roundMoney(cgst + sgst + igst);
  const rcm = Boolean(isRCM) && taxAmount > 0;
  // Under RCM the buyer pays the tax to the government, not to the seller.
  const subtotal = roundMoney(taxableAmount + (rcm ? 0 : taxAmount));
  const roundOff = roundMoney(Math.round(subtotal) - subtotal);
  const netPayable = roundMoney(subtotal + roundOff);

  return {
    grossAmount,
    discount: invoiceDiscount,
    taxableAmount,
    cgst,
    sgst,
    igst,
    taxAmount,
    rcm,
    gstType: inter ? "INTER" : "INTRA",
    subtotal,
    roundOff,
    netPayable,
  };
};

/** Payments posted by accounting vouchers cannot be edited from the purchase form (ACC-11). */
export const isVoucherPayment = (p) =>
  Boolean(p && (p.voucherId || /^PV-/i.test(String(p.referenceNo || ""))));

/** Migrated (legacy) purchases only allow detail edits; amounts, items and payments are locked. */
export const isLegacyPurchase = (purchase) =>
  Boolean(purchase) &&
  (Boolean(purchase.isOpeningStock) || !/^(PUR\/|INV-\d+$)/.test(String(purchase.invoiceNo || "")));
