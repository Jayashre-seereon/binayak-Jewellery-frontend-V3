import { todayLocal } from "./sale-calculations";

export const PAYMENT_MODES = [
  { label: "Cash", value: "CASH" },
  { label: "UPI", value: "UPI" },
  { label: "Card", value: "CARD" },
  { label: "Bank transfer / Online", value: "ONLINE" },
  { label: "Cheque", value: "CHEQUE" },
  { label: "Other", value: "OTHER" },
];

// Channels are only offered where they mean something; nothing is pre-selected except for cash.
export const CHANNELS_BY_MODE = {
  CASH: ["Cash Counter"],
  UPI: ["PhonePe", "Google Pay", "Paytm", "BHIM UPI", "Bank QR", "Other UPI"],
  CARD: ["HDFC POS", "SBI POS", "ICICI POS", "Axis POS", "Other POS"],
  ONLINE: ["NEFT", "RTGS", "IMPS", "Other"],
  CHEQUE: [],
  OTHER: [],
};

export const DEFAULT_CHANNEL = { CASH: "Cash Counter" };
export const REFERENCE_HINT = {
  CASH: "Optional",
  UPI: "UPI Ref / UTR",
  CARD: "Card approval code",
  ONLINE: "UTR / Ref no.",
  CHEQUE: "Cheque no. / bank",
  OTHER: "Reference",
};

export const emptyPayment = (amount = "") => ({
  paymentMode: "CASH",
  paymentChannel: DEFAULT_CHANNEL.CASH,
  amount,
  transactionId: "",
  referenceNo: "",
  description: "",
  paymentDate: todayLocal(),
  narration: "",
});

export const paymentNeedsReference = (p) => ["UPI", "CARD", "ONLINE", "CHEQUE"].includes(p.paymentMode);

