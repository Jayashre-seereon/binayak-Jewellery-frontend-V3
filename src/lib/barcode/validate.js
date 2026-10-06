import { isValidEan13 } from "./config";

/** Mirrors the server rule for item codes and piece barcodes; returns an error message or null. */
export const validateBarcodeText = (value) => {
  const code = String(value || "").trim();
  if (!code) return "Enter a barcode.";
  if (/^\d{13}$/.test(code)) return isValidEan13(code) ? null : "This 13-digit code fails the EAN-13 check digit — re-scan or check the digits.";
  if (!/^[\x20-\x7e]+$/.test(code)) return "Barcode may contain printable characters only.";
  if (code.length < 4 || code.length > 48) return "Barcode must be 4 to 48 characters.";
  return null;
};
