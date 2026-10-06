import { useState } from "react";
import { CheckCircle2, Loader2, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getInventoryLabelsBulkPdf } from "@/api/barcode-api";
import BarcodeImage from "@/lib/barcode/barcode-image";
import { openBlob } from "@/lib/barcode/feedback";
import { notifyError } from "@/utils/notify";
import { formatWeight } from "@/utils/units";

/** Shown after a successful save: the pieces that are now on the counter, ready for labels. */
export default function StockEntryResult({ result, onNewEntry }) {
  const [printing, setPrinting] = useState(false);
  const { purchase, pieces = [] } = result;

  const printLabels = async () => {
    try {
      setPrinting(true);
      const pdf = await getInventoryLabelsBulkPdf(pieces.map((p) => p.id));
      openBlob(pdf, `labels-${purchase?.invoiceNo || pieces.length}.pdf`);
    } catch (error) {
      notifyError(error, "Could not print labels.");
    } finally {
      setPrinting(false);
    }
  };

  return (
    <section className="space-y-3 rounded-lg border border-emerald-200 bg-white p-4 shadow-sm" aria-labelledby="stock-entry-result-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="stock-entry-result-title" className="flex items-center gap-1.5 text-base font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5" /> {pieces.length} piece{pieces.length === 1 ? "" : "s"} added to stock
          </h2>
          <p className="text-xs text-slate-500">
            {purchase?.isOpeningStock ? "Opening stock" : "Supplier purchase"} {purchase?.invoiceNo ? `· ${purchase.invoiceNo}` : ""}
            {purchase?.date ? ` · ${new Date(purchase.date).toLocaleDateString("en-IN")}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={printLabels} disabled={printing || !pieces.length} className="gap-1.5">
            {printing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Print labels
          </Button>
          <Button variant="outline" onClick={onNewEntry} className="gap-1.5">
            <Plus className="h-4 w-4" /> New entry
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="p-2 text-left">#</th>
              <th className="p-2 text-left">Barcode</th>
              <th className="p-2 text-left">Item</th>
              <th className="p-2 text-left">Purity</th>
              <th className="p-2 text-right">Pcs</th>
              <th className="p-2 text-right">Net wt</th>
              <th className="p-2 text-left">HUID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pieces.map((piece, index) => (
              <tr key={piece.id}>
                <td className="p-2 text-xs text-slate-500">{index + 1}</td>
                <td className="p-2">
                  {piece.barcodeNo ? (
                    <div className="space-y-0.5">
                      <BarcodeImage code={piece.barcodeNo} symbology="CODE128" height={7} scale={1} includeText={0} className="h-7" />
                      <div className="font-mono text-[11px] text-slate-700">{piece.barcodeNo}</div>
                    </div>
                  ) : (
                    <span className="text-xs text-amber-700">No barcode</span>
                  )}
                </td>
                <td className="p-2">
                  <div className="font-medium text-slate-900">{piece.itemName || "-"}</div>
                  <div className="text-[11px] text-slate-500">
                    {[piece.productName, piece.inventoryCode].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="p-2 text-xs font-semibold text-amber-700">{piece.purityName || "-"}</td>
                <td className="p-2 text-right text-xs">{piece.pieces ?? 1}</td>
                <td className="p-2 text-right text-xs">{formatWeight(piece.netWeight)}</td>
                <td className="p-2 font-mono text-xs">{piece.huidNo || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
