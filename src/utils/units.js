export const roundMoney = (val) =>
  Math.round((Number(val || 0) + Number.EPSILON) * 100) / 100;

export const money = (val) => roundMoney(val).toFixed(2);

// Weight formatter: default 3 decimal places for grams/kg, integer for pcs
export const weightStr = (val) => Number(val || 0).toFixed(3);

export const formatUnit = (val, unit) => {
  const n = Number(val || 0);
  switch ((unit || "").toString().toLowerCase()) {
    case "g":
    case "gm":
      return `${n.toFixed(3)} gm`;
    case "kg":
      return `${n.toFixed(3)} kg`;
    case "pcs":
    case "pc":
      return `${Number.isInteger(n) ? n : n.toFixed(0)} pcs`;
    case "%":
      return `${n.toFixed(2)}%`;
    default:
      return `${n}`;
  }
};

export const formatWeight = (val, unit = "gm") => {
  const n = Number(val || 0);
  const normalizedUnit = (unit || "gm").toString().toLowerCase();
  if (normalizedUnit === "kg") {
    return `${n.toFixed(3)} kg`;
  }
  return `${n.toFixed(3)} gm`;
};

export const formatCharge = (amount, type = "AMOUNT", rate = 0) => {
  const normalizedType = (type || "").toString().toUpperCase();
  if (normalizedType === "PERCENT") {
    return `${Number(rate || 0).toFixed(3)} %`;
  }
  if (normalizedType === "PER_GRAM") {
    return `${Number(rate || 0).toFixed(2)} /gm`;
  }
  return `₹${money(amount)}`;
};

export default {
  roundMoney,
  money,
  weightStr,
  formatUnit,
  formatWeight,
  formatCharge,
};
