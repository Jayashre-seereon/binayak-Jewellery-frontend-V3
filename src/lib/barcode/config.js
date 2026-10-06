// Defaults mirror the server's BarcodeConfig (CONTRACT.md §5). Used until /api/barcode/config answers
// and to fill any field an older saved config does not carry yet.
export const DEFAULT_BARCODE_CONFIG = Object.freeze({
  deviceMode: "KEYBOARD_WEDGE",
  prefix: "",
  suffix: "",
  terminator: "Enter",
  minLength: 4,
  maxLength: 64,
  interKeyTimeoutMs: 50,
  autoAddToBill: true,
  beepOnScan: true,
  allowManualEntry: true,
  serialBaudRate: 9600,
  serialDataBits: 8,
  serialStopBits: 1,
  serialParity: "none",
  symbology: "CODE128",
  itemBarcodePrefix: "29",
  labelWidthMm: 50,
  labelHeightMm: 25,
  labelFields: ["storeName", "itemName", "purity", "grossWeight", "netWeight", "huidNo", "barcodeText", "price"],
});

export const DEVICE_MODES = [
  { value: "KEYBOARD_WEDGE", label: "Keyboard wedge (USB / Bluetooth HID)" },
  { value: "SERIAL", label: "Serial / COM port (Web Serial)" },
];

export const TERMINATORS = [
  { value: "Enter", label: "Enter (CR)" },
  { value: "Tab", label: "Tab" },
  { value: "None", label: "None (detect by pause)" },
];

export const SYMBOLOGIES = [
  { value: "CODE128", label: "Code 128" },
  { value: "EAN13", label: "EAN-13" },
  { value: "QRCODE", label: "QR Code" },
];

export const SERIAL_PARITIES = ["none", "even", "odd"];
export const SERIAL_BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200];

export const LABEL_FIELDS = [
  { value: "storeName", label: "Store name" },
  { value: "itemName", label: "Item name" },
  { value: "purity", label: "Purity" },
  { value: "grossWeight", label: "Gross weight" },
  { value: "netWeight", label: "Net weight" },
  { value: "huidNo", label: "HUID" },
  { value: "barcodeText", label: "Barcode text" },
  { value: "price", label: "Price" },
];

const clampInt = (value, min, max, fallback) => {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/** Merges a (possibly partial / legacy) server config over the defaults and sanitises numbers. */
export const normalizeBarcodeConfig = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const { productBarcodePrefix: legacyPrefix, ...rest } = source;
  const cfg = { ...DEFAULT_BARCODE_CONFIG, ...rest };
  // Servers before v3.1 still answer with productBarcodePrefix.
  if (source.itemBarcodePrefix == null && legacyPrefix != null) cfg.itemBarcodePrefix = String(legacyPrefix);
  cfg.minLength = clampInt(cfg.minLength, 1, 128, DEFAULT_BARCODE_CONFIG.minLength);
  cfg.maxLength = clampInt(cfg.maxLength, cfg.minLength, 256, DEFAULT_BARCODE_CONFIG.maxLength);
  cfg.interKeyTimeoutMs = clampInt(cfg.interKeyTimeoutMs, 5, 1000, DEFAULT_BARCODE_CONFIG.interKeyTimeoutMs);
  cfg.serialBaudRate = clampInt(cfg.serialBaudRate, 300, 1000000, DEFAULT_BARCODE_CONFIG.serialBaudRate);
  cfg.serialDataBits = [7, 8].includes(Number(cfg.serialDataBits)) ? Number(cfg.serialDataBits) : 8;
  cfg.serialStopBits = [1, 2].includes(Number(cfg.serialStopBits)) ? Number(cfg.serialStopBits) : 1;
  if (!SERIAL_PARITIES.includes(cfg.serialParity)) cfg.serialParity = "none";
  if (!TERMINATORS.some((t) => t.value === cfg.terminator)) cfg.terminator = "Enter";
  if (!DEVICE_MODES.some((m) => m.value === cfg.deviceMode)) cfg.deviceMode = "KEYBOARD_WEDGE";
  cfg.prefix = String(cfg.prefix ?? "");
  cfg.suffix = String(cfg.suffix ?? "");
  if (!Array.isArray(cfg.labelFields)) cfg.labelFields = [...DEFAULT_BARCODE_CONFIG.labelFields];
  return cfg;
};

/** Strips scanner prefix/suffix and control characters, then trims. */
export const cleanScannedCode = (raw, config = DEFAULT_BARCODE_CONFIG) => {
  // eslint-disable-next-line no-control-regex
  let code = String(raw ?? "").replace(/[\u0000-\u001f\u007f]/g, "");
  const { prefix, suffix } = config || {};
  if (prefix && code.startsWith(prefix)) code = code.slice(prefix.length);
  if (suffix && code.endsWith(suffix)) code = code.slice(0, code.length - suffix.length);
  return code.trim();
};

/** Appends the EAN-13 check digit to a 12-digit payload. */
export const withEan13CheckDigit = (digits12) => {
  const d = String(digits12).replace(/\D/g, "").padStart(12, "0").slice(0, 12);
  const sum = d.split("").reduce((acc, ch, i) => acc + Number(ch) * (i % 2 === 0 ? 1 : 3), 0);
  return d + String((10 - (sum % 10)) % 10);
};

export const isValidEan13 = (code) => /^\d{13}$/.test(String(code)) && withEan13CheckDigit(String(code).slice(0, 12)) === String(code);
