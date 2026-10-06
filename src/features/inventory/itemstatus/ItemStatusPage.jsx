import { useRef, useState } from "react";
import { AlertTriangle, ArrowLeftRight, Barcode, Loader2, Package, Receipt, ScanBarcode, Search, ShoppingCart } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { notifyError } from "@/utils/notify";
import { formatWeight } from "@/utils/units";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import ScannerStatus from "@/lib/barcode/scanner-status";
import BarcodeImage from "@/lib/barcode/barcode-image";
import { cleanScannedCode } from "@/lib/barcode/config";
import { playBeep, playErrorBeep } from "@/lib/barcode/feedback";
import { getItemStatus } from "./item-status-api";
import ChangeBarcodeDialog from "./change-barcode-dialog";

const RELABEL_STATUSES = ["AVAILABLE", "RESERVED"];

const STATUS_TONE = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOLD: "bg-slate-100 text-slate-700 border-slate-300",
  RESERVED: "bg-blue-50 text-blue-700 border-blue-200",
  PENDING: "bg-amber-50 text-amber-800 border-amber-200",
  DAMAGED: "bg-red-50 text-red-700 border-red-200",
  MELTED: "bg-orange-50 text-orange-700 border-orange-200",
  REFINED: "bg-purple-50 text-purple-700 border-purple-200",
};

const STATUS_HINT = {
  AVAILABLE: "In stock and can be billed.",
  SOLD: "Already sold — cannot be billed again.",
  RESERVED: "Reserved for a customer; release it before billing.",
  PENDING: "In transit (stock transfer not yet received).",
  DAMAGED: "Marked damaged; not sellable.",
  MELTED: "Sent for melting.",
  REFINED: "Refined after melting.",
};

const fmtDate = (v) => (v ? new Date(v).toLocaleDateString("en-IN") : "-");
const money = (v) => `₹${Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] text-slate-500">{label}</dt>
      <dd className="text-sm font-medium text-slate-900 break-words">{children ?? "-"}</dd>
    </div>
  );
}

export default function ItemStatusPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [searched, setSearched] = useState("");
  const [relabelOpen, setRelabelOpen] = useState(false);
  const requestRef = useRef(0);

  const lookup = async (raw, { fromScanner = false } = {}) => {
    const value = String(raw || "").trim();
    if (!value) return;
    const ticket = ++requestRef.current;
    setLoading(true);
    setSearched(value);
    setCode(value);
    try {
      const found = await getItemStatus(value);
      if (ticket !== requestRef.current) return;
      setResult(found);
      if (fromScanner) (found ? playBeep : playErrorBeep)();
    } catch (error) {
      if (ticket !== requestRef.current) return;
      setResult(null);
      notifyError(error, "Lookup failed.");
    } finally {
      if (ticket === requestRef.current) setLoading(false);
    }
  };

  const scanner = useBarcodeScanner({
    enabled: !relabelOpen,
    onScan: (scan) => lookup(scan.code, { fromScanner: scan.source !== "manual" }),
  });

  const inv = result?.inventory;
  const saleItems = Array.isArray(inv?.saleItems) ? inv.saleItems : [];
  const transfers = Array.isArray(inv?.transferItems) ? inv.transferItems : [];
  const extra = inv?.extraDetails && typeof inv.extraDetails === "object" ? inv.extraDetails : {};

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Item Status</h1>
          <p className="text-xs text-slate-500">Scan a tag anywhere on this page, or type a barcode, tag no., HUID or inventory code.</p>
        </div>
        <ScannerStatus scanner={scanner} />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row" data-scanner-ignore>
        <div className="relative w-full sm:w-96">
          <ScanBarcode className="absolute left-3 top-2.5 h-4 w-4 text-blue-600" />
          <Input
            autoFocus
            placeholder="Barcode / Tag / HUID / Inventory code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                lookup(cleanScannedCode(code, scanner.config));
              }
            }}
            className="pl-9"
          />
        </div>
        <Button onClick={() => lookup(cleanScannedCode(code, scanner.config))} disabled={loading || !code.trim()} className="gap-1.5">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
        </Button>
      </div>

      {loading && !inv && (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Looking up {searched}…
        </div>
      )}

      {!loading && searched && !inv && (
        <div className="flex items-center gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4" /> No piece found for "{searched}" in this store.
        </div>
      )}

      {inv && (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-4 ${loading ? "opacity-60" : ""}`}>
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
                    <Package className="h-5 w-5 text-blue-600" />
                    {inv.item?.name || inv.product?.name || inv.inventoryCode}
                  </div>
                  <div className="text-xs text-slate-500">
                    {[inv.product?.name, inv.metal?.name, inv.purityMaster?.name].filter(Boolean).join(" · ")} · matched by {result.matchedBy}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`inline-block rounded-full border px-3 py-1 text-sm font-bold ${STATUS_TONE[inv.status] || STATUS_TONE.SOLD}`}>{inv.status}</span>
                  <div className="mt-1 text-[11px] text-slate-500">{STATUS_HINT[inv.status] || ""}</div>
                  {RELABEL_STATUSES.includes(inv.status) && (
                    <Button variant="outline" size="sm" className="mt-2 gap-1" onClick={() => setRelabelOpen(true)}>
                      <Barcode className="h-3.5 w-3.5" /> Change barcode
                    </Button>
                  )}
                </div>
              </div>
              {extra.relabelRequired && (
                <div className="mt-3 flex items-center gap-2 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
                  <AlertTriangle className="h-3.5 w-3.5" /> This piece received a new barcode on transfer — reprint its label.
                </div>
              )}
              <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3">
                <Detail label="Barcode">
                  <span className="font-mono">{inv.barcodeNo || "-"}</span>
                </Detail>
                <Detail label="Tag No.">
                  <span className="font-mono">{inv.tagNo || "-"}</span>
                </Detail>
                <Detail label="Inventory code">{inv.inventoryCode}</Detail>
                <Detail label="HUID">{inv.huidNo || "-"}</Detail>
                <Detail label="Store">{inv.store?.storeName || (inv.storeId ? `Store #${inv.storeId}` : "-")}</Detail>
                <Detail label="Stock type">{inv.purchaseType}</Detail>
                <Detail label="HSN">{inv.hsnCode || "-"}</Detail>
                <Detail label="Pieces">{inv.pieces ?? 1}</Detail>
                <Detail label="Gross weight">{formatWeight(inv.grossWeight)}</Detail>
                <Detail label="Stone weight">{formatWeight(inv.stoneWeight)}</Detail>
                <Detail label="Net weight">{formatWeight(inv.netWeight)}</Detail>
                <Detail label="Purity">{inv.purityMaster?.name || inv.purity || "-"}</Detail>
                {inv.stone?.name && <Detail label="Stone">{inv.stone.name}</Detail>}
                {inv.assayCertNo && <Detail label="Assay cert.">{inv.assayCertNo}</Detail>}
                {inv.barSerialNo && <Detail label="Bar serial">{inv.barSerialNo}</Detail>}
                <Detail label="Last updated">{fmtDate(inv.updatedAt)}</Detail>
              </dl>
              {inv.narration && <p className="mt-3 text-xs text-slate-600">Note: {inv.narration}</p>}
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
              <h2 className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                <Receipt className="h-4 w-4 text-blue-600" /> History
              </h2>
              <ol className="space-y-2 border-l-2 border-slate-200 pl-4 text-sm">
                {inv.purchase && (
                  <li>
                    <div className="font-semibold text-slate-800">
                      {inv.purchase.isOpeningStock ? "Opening stock" : "Purchased"} · {fmtDate(inv.purchase.date)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {inv.purchase.isOpeningStock ? "Migrated on-hand stock" : `Invoice ${inv.purchase.invoiceNo || "-"}`}
                      {inv.purchase.customerName ? ` · from ${inv.purchase.customerName}` : ""}
                      {inv.purchase.referenceNo ? ` · Ref ${inv.purchase.referenceNo}` : ""}
                    </div>
                  </li>
                )}
                <li>
                  <div className="font-semibold text-slate-800">Tagged into stock · {fmtDate(inv.createdAt)}</div>
                  <div className="text-xs text-slate-500">{inv.inventoryCode}</div>
                </li>
                {transfers.map((t) => (
                  <li key={t.id}>
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer {t.transfer?.transferNo || `#${t.transferId}`} · {fmtDate(t.transfer?.createdAt || t.createdAt)}
                    </div>
                    {t.transfer?.status && <div className="text-xs text-slate-500">{t.transfer.status}</div>}
                  </li>
                ))}
                {saleItems.map((si) => (
                  <li key={si.id}>
                    <div className="flex items-center gap-1 font-semibold text-slate-800">
                      <ShoppingCart className="h-3.5 w-3.5" /> {si.sale?.status === "CANCELLED" ? "Sale cancelled" : "Sold"} · {fmtDate(si.sale?.saleDate || si.createdAt)}
                    </div>
                    <div className="text-xs text-slate-500">
                      Invoice {si.sale?.invoiceNo || `#${si.saleId}`}
                      {si.sale?.customerName ? ` · ${si.sale.customerName}` : ""} · {money(si.totalAmount)}
                    </div>
                  </li>
                ))}
                {inv.status === "SOLD" && saleItems.length === 0 && (
                  <li className="text-xs text-slate-500">Sold — invoice details are not included in this lookup.</li>
                )}
              </ol>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm text-center space-y-2">
              {inv.barcodeNo ? (
                <BarcodeImage code={inv.barcodeNo} symbology="CODE128" className="mx-auto h-20" />
              ) : (
                <p className="text-xs text-amber-700">This piece has no barcode yet.</p>
              )}
              {inv.itemPhoto && <img src={inv.itemPhoto} alt="Item" className="mx-auto max-h-48 rounded border object-contain" />}
            </div>
          </div>
        </div>
      )}

      {inv && (
        <ChangeBarcodeDialog
          open={relabelOpen}
          setOpen={setRelabelOpen}
          inventory={inv}
          scanConfig={scanner.config}
          onChanged={(newCode) => lookup(newCode)}
        />
      )}
    </div>
  );
}
