import { ScanBarcode, Usb } from "lucide-react";

const TONES = {
  listening: "bg-emerald-50 text-emerald-700 border-emerald-200",
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200",
  connecting: "bg-blue-50 text-blue-700 border-blue-200",
  disconnected: "bg-amber-50 text-amber-800 border-amber-200",
  error: "bg-red-50 text-red-700 border-red-200",
  unsupported: "bg-red-50 text-red-700 border-red-200",
  disabled: "bg-slate-50 text-slate-500 border-slate-200",
};

/** Small pill showing scanner readiness, plus a "Connect" button in SERIAL mode. */
export default function ScannerStatus({ scanner, compact = false }) {
  if (!scanner) return null;
  const { status, statusMessage, config, connectSerial } = scanner;
  const isSerial = config?.deviceMode === "SERIAL";
  const showConnect = isSerial && (status === "disconnected" || status === "error");
  const Icon = isSerial ? Usb : ScanBarcode;

  return (
    <div className="inline-flex items-center gap-2" data-scanner-ignore>
      <span
        title={statusMessage}
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${TONES[status] || TONES.disabled}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            status === "listening" || status === "connected" ? "bg-emerald-500 animate-pulse" : "bg-current opacity-60"
          }`}
        />
        <Icon className="h-3.5 w-3.5" />
        {!compact && <span className="max-w-[260px] truncate">{statusMessage}</span>}
      </span>
      {showConnect && (
        <button
          type="button"
          onClick={() => connectSerial()}
          className="rounded-md border border-blue-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-50"
        >
          Connect scanner
        </button>
      )}
    </div>
  );
}
