import { validateBarcodeText } from "@/lib/barcode/validate";
import { roundMoney } from "@/utils/units";

export const MAX_LINES = 200;
export const MODES = { OPENING: "OPENING", PURCHASE: "PURCHASE" };
export const SALE_MAKING_TYPES = [
  { value: "PERCENT", label: "%" },
  { value: "PER_GRAM", label: "₹/g" },
  { value: "FLAT", label: "₹ flat" },
];
export const PAYMENT_MODES = ["CASH", "UPI", "CARD", "BANK", "CHEQUE"];

let rowSeq = 1;
let paymentSeq = 1;

export const createRow = (patch = {}) => ({
  itemId: "",
  unmatchedName: "",
  purityId: "",
  pieces: "1",
  grossWeight: "",
  stoneWeight: "",
  huidNo: "",
  barcode: "",
  saleMakingType: "",
  saleMakingRate: "",
  rate: "",
  makingCharges: "",
  stoneAmount: "",
  ...patch,
  key: `row-${rowSeq++}`,
});

export const duplicateRow = (row) =>
  // A copied barcode would always clash, so the copy starts with "Auto" again.
  createRow({ ...row, barcode: "", huidNo: "" });

export const createPayment = () => ({ key: `pay-${paymentSeq++}`, paymentMode: "CASH", amount: "" });

export const num = (value) => {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
};

export const round3 = (value) => Math.round((Number(value) + Number.EPSILON) * 1000) / 1000;

/** Keeps digits and one decimal point ("012.50" → "12.50"). */
export const decimalInput = (value = "") => {
  const cleaned = String(value).replace(/[^\d.]/g, "");
  if (!cleaned) return "";
  const [whole, ...fraction] = cleaned.split(".");
  const head = whole.replace(/^0+(?=\d)/, "") || "0";
  return fraction.length ? `${head}.${fraction.join("")}` : head;
};

export const intInput = (value = "") => String(value).replace(/\D/g, "").slice(0, 4);

export const netWeight = (row) => round3(Math.max(0, num(row.grossWeight) - num(row.stoneWeight)));

export const lineValue = (row) =>
  roundMoney(netWeight(row) * num(row.rate) + num(row.makingCharges) + num(row.stoneAmount));

export const normalizeCode = (value) => String(value || "").trim().toUpperCase();

/** A row the user never touched is ignored on save (Enter / scans can leave a trailing blank row). */
export const isBlankRow = (row) =>
  !row.itemId &&
  !row.unmatchedName &&
  !String(row.grossWeight).trim() &&
  !String(row.stoneWeight).trim() &&
  !row.huidNo.trim() &&
  !row.barcode.trim();

/** Default purity of an item option: its own, else its product's. */
export const itemDefaultPurityId = (option) => {
  const id = option?.purityId ?? option?.purity?.id ?? option?.product?.purityId ?? option?.product?.purity?.id;
  return id ? String(id) : "";
};

export const totalsOf = (rows) =>
  rows.reduce(
    (acc, row) => {
      if (isBlankRow(row)) return acc;
      acc.tags += 1;
      acc.pieces += Math.max(1, Number.parseInt(row.pieces, 10) || 1);
      acc.gross = round3(acc.gross + num(row.grossWeight));
      acc.net = round3(acc.net + netWeight(row));
      acc.value = roundMoney(acc.value + lineValue(row));
      return acc;
    },
    { tags: 0, pieces: 0, gross: 0, net: 0, value: 0 }
  );

/** Grid row keys whose barcode appears more than once (case-insensitive). */
export const duplicateBarcodeKeys = (rows) => {
  const byCode = new Map();
  rows.forEach((row) => {
    const code = normalizeCode(row.barcode);
    if (!code) return;
    byCode.set(code, [...(byCode.get(code) || []), row.key]);
  });
  const keys = new Set();
  byCode.forEach((list) => list.length > 1 && list.forEach((k) => keys.add(k)));
  return keys;
};

/**
 * Client checks mirroring the server (CONTRACT v3.1). Returns
 * { header: {field: msg}, rows: {rowKey: [msg]}, general: [msg] }; empty objects/arrays when valid.
 */
export function validateEntry({ mode, header, rows, payments, barcodeChecks }) {
  const result = { header: {}, rows: {}, general: [] };
  const addRow = (key, msg) => {
    result.rows[key] = [...(result.rows[key] || []), msg];
  };

  if (!header.date) result.header.date = "Choose the entry date.";
  if (mode === MODES.PURCHASE && !header.partyId) result.header.partyId = "Choose the supplier.";

  const lines = rows.filter((r) => !isBlankRow(r));
  if (!lines.length) result.general.push("Add at least one piece.");
  if (lines.length > MAX_LINES) result.general.push(`One entry can hold at most ${MAX_LINES} pieces (this one has ${lines.length}).`);

  const duplicates = duplicateBarcodeKeys(lines);
  lines.forEach((row) => {
    if (!row.itemId) {
      addRow(row.key, row.unmatchedName ? `No item named "${row.unmatchedName}" — pick the item.` : "Choose the item.");
    } else if (!row.purityId) {
      addRow(row.key, "Choose the purity (this item has no default purity).");
    }
    const gross = num(row.grossWeight);
    if (!(gross > 0)) addRow(row.key, "Gross weight must be more than 0.");
    if (num(row.stoneWeight) > gross) addRow(row.key, "Stone weight cannot be more than gross weight.");
    if (!(Number.parseInt(row.pieces, 10) >= 1)) addRow(row.key, "Pcs must be at least 1.");
    const code = row.barcode.trim();
    if (code) {
      const err = validateBarcodeText(code);
      if (err) addRow(row.key, err);
      if (duplicates.has(row.key)) addRow(row.key, `Barcode ${code} is used on more than one row.`);
      const check = barcodeChecks[row.key];
      if (check?.code === normalizeCode(code) && check.state === "taken") {
        addRow(row.key, `Barcode ${code} is already used${check.usedBy ? ` by ${check.usedBy}` : ""}.`);
      }
    }
    if (num(row.saleMakingRate) > 0 && !row.saleMakingType) addRow(row.key, "Choose how the sale making is charged.");
  });

  if (mode === MODES.PURCHASE) {
    payments.forEach((p, i) => {
      if (String(p.amount).trim() && !(num(p.amount) > 0)) result.general.push(`Payment ${i + 1}: amount must be more than 0.`);
    });
  }
  return result;
}

export const hasErrors = (v) => Object.keys(v.header).length > 0 || Object.keys(v.rows).length > 0 || v.general.length > 0;

const optionalNumber = (value) => (String(value ?? "").trim() === "" ? undefined : num(value));

/** Builds the POST /api/stock/entries body; `keys[i]` is the grid row behind lines[i] (for "Row N:" errors). */
export function buildPayload({ mode, header, rows, payments }) {
  const lines = rows.filter((r) => !isBlankRow(r));
  const purchase = mode === MODES.PURCHASE;
  const body = {
    mode,
    date: header.date,
    narration: header.narration.trim() || undefined,
    lines: lines.map((row) => {
      const line = {
        itemId: Number(row.itemId),
        purityId: row.purityId ? Number(row.purityId) : undefined,
        pieces: Math.max(1, Number.parseInt(row.pieces, 10) || 1),
        grossWeight: round3(num(row.grossWeight)),
        stoneWeight: round3(num(row.stoneWeight)),
        huidNo: row.huidNo.trim() || undefined,
        barcode: row.barcode.trim() || undefined,
      };
      if (row.saleMakingType) {
        line.saleMakingType = row.saleMakingType;
        line.saleMakingRate = num(row.saleMakingRate);
      }
      if (purchase) {
        line.rate = optionalNumber(row.rate);
        line.makingCharges = optionalNumber(row.makingCharges);
        line.stoneAmount = optionalNumber(row.stoneAmount);
      }
      return line;
    }),
  };
  if (purchase) {
    body.partyId = Number(header.partyId);
    body.referenceNo = header.referenceNo.trim() || undefined;
    body.applyGst = header.applyGst;
    body.placeOfSupply = header.placeOfSupply.trim() || undefined;
    const paid = payments.filter((p) => num(p.amount) > 0).map((p) => ({ paymentMode: p.paymentMode, amount: roundMoney(num(p.amount)) }));
    if (paid.length) body.payments = paid;
  }
  return { body, keys: lines.map((r) => r.key) };
}

/** "Row 3: gross weight …" → 3 (1-based), or null. */
export const rowNumberFromError = (message) => {
  const match = /^\s*Row\s+(\d+)\s*:/i.exec(String(message || ""));
  return match ? Number(match[1]) : null;
};

const normalizeName = (value) => String(value || "").trim().replace(/\s+/g, " ").toUpperCase();

/**
 * Parses pasted spreadsheet rows: Item name | Gross | Stone | HUID | Barcode | Pcs | Purity.
 * Tab-separated when the line has a tab, otherwise comma-separated. A first line whose Gross cell
 * is not a number is treated as a header.
 */
export function parsePastedRows(text, itemOptions, purities = []) {
  const byName = new Map(itemOptions.map((o) => [normalizeName(o.name), o]));
  const squash = (v) => normalizeName(v).replace(/[^A-Z0-9]/g, "");
  const purityByName = new Map(purities.map((p) => [squash(p.name), p]));
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ""))
    .filter((l) => l.trim());
  const cells = lines.map((line) => (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim()));
  const [firstName = "", firstGross = ""] = cells[0] || [];
  const looksLikeHeader =
    !byName.has(normalizeName(firstName)) && ((firstGross && !/^\d*\.?\d+$/.test(firstGross)) || /^item/i.test(firstName));
  if (looksLikeHeader) cells.shift();

  return cells.map(([name = "", gross = "", stone = "", huid = "", barcode = "", pcs = "", purity = ""]) => {
    const option = byName.get(normalizeName(name));
    const pastedPurity = purity ? purityByName.get(squash(purity)) : null;
    return createRow({
      itemId: option ? String(option.id) : "",
      unmatchedName: option ? "" : name,
      purityId: pastedPurity ? String(pastedPurity.id) : itemDefaultPurityId(option),
      grossWeight: decimalInput(gross),
      stoneWeight: decimalInput(stone),
      huidNo: huid.toUpperCase().replace(/[^A-Z0-9]/g, ""),
      barcode,
      pieces: intInput(pcs) || "1",
    });
  });
}
