import React, { useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, X, CheckCircle, AlertCircle } from "lucide-react";
import { numberToWordsIndian } from "@/utils/numberToWords";
import { useAuthStore } from "@/store/authStore";
import { getVoucherPdf } from "@/api/accounting-api";
import { notifyError } from "@/utils/notify";
import InvoiceBrandHeader from "@/components/invoice-brand-header";

export default function VoucherPrintModal({ open, setOpen, voucher }) {
  const printRef = useRef(null);
  const selectedStore = useAuthStore((state) => state.selectedStore);

  if (!voucher) return null;

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    printWindow.document.write(`
      <html>
        <head>
          <title>${voucher.voucherNo} - Voucher Slip</title>
          <style>
            @page { size: A5 landscape; margin: 12mm; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 13px; }
            .invoice-brand-header { min-height: 72px !important; color: white; display: flex; align-items: center; background: #1f2357; }
            .invoice-brand-header > div:first-child, .invoice-brand-header > div:last-of-type { width: 14px !important; background: #c9a24a; align-self: stretch; }
            .invoice-brand-circle, .invoice-since-badge { width: 48px !important; height: 48px !important; border-radius: 50%; }
            .invoice-brand-header .truncate { font-size: 16px; font-weight: 700; }
            .invoice-brand-header .text-\\[10px\\] { font-size: 8px; }
            .invoice-brand-header .text-\\[8px\\] { font-size: 7px; }
            .invoice-brand-header .text-\\[4\\.5px\\] { font-size: 4.5px; }
            .voucher-title { font-size: 14px; font-weight: bold; text-align: center; background: #f1f5f9; padding: 4px; margin: 8px 0; border: 1px solid #cbd5e1; border-radius: 4px; text-transform: uppercase; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px; }
            .meta-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px dashed #e2e8f0; }
            .meta-label { color: #64748b; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .meta-val { font-weight: 600; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; font-size: 11px; font-weight: 700; text-transform: uppercase; }
            td { border: 1px solid #cbd5e1; padding: 6px 8px; font-size: 12px; }
            .text-right { text-align: right; }
            .total-row { font-weight: bold; background: #f1f5f9; }
            .words-box { margin: 10px 0; padding: 8px; background: #fafafa; border: 1px dashed #cbd5e1; border-radius: 4px; font-style: italic; font-size: 12px; }
            .narration-box { margin: 8px 0; font-size: 12px; }
            .sign-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-top: 36px; text-align: center; }
            .sign-line { border-top: 1px solid #0f172a; padding-top: 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; }
            .cancelled-banner { border: 2px dashed #ef4444; color: #dc2626; padding: 6px; text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 10px; text-transform: uppercase; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleDownload = async () => {
    try {
      const blob = await getVoucherPdf(voucher.id);
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = `${voucher.voucherType || "Voucher"}-${voucher.voucherNo || voucher.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (error) {
      notifyError(error, "Failed to download voucher PDF.");
    }
  };

  const isCancelled = voucher.status === "CANCELLED";
  const formattedDate = voucher.date ? new Date(voucher.date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }) : "-";

  const totalDebit = voucher.entries?.reduce((s, e) => s + Number(e.debit || 0), 0) || voucher.amount;
  const totalCredit = voucher.entries?.reduce((s, e) => s + Number(e.credit || 0), 0) || voucher.amount;
  const inWords = numberToWordsIndian(voucher.amount || totalDebit);

  const voucherTypeLabel =
    voucher.voucherType === "RECEIPT"
      ? "Receipt Voucher"
      : voucher.voucherType === "PAYMENT"
      ? "Payment Voucher"
      : "Journal Entry Voucher";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="!w-[95vw] !max-w-[760px] p-0 max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 py-4 border-b flex flex-row items-center justify-between">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <span>{voucherTypeLabel}</span>
            <span className="font-mono text-xs px-2 py-0.5 bg-slate-100 rounded text-slate-700">
              {voucher.voucherNo}
            </span>
          </DialogTitle>
          <div className="flex items-center gap-2 pr-6">
            <Button size="sm" variant="outline" onClick={handleDownload} className="gap-1.5">
              <Download size={15} />
              <span>Download PDF</span>
            </Button>
            <Button size="sm" variant="outline" onClick={handlePrint} className="gap-1.5">
              <Printer size={15} />
              <span>Print Slip</span>
            </Button>
          </div>
        </DialogHeader>

        <div className="p-6 overflow-y-auto flex-1">
            <div ref={printRef} className="bg-white p-6 border rounded-lg shadow-xs text-slate-800">
            <InvoiceBrandHeader store={selectedStore} />

            {/* Cancelled Banner */}
            {isCancelled && (
              <div className="cancelled-banner mb-3 p-2 bg-red-50 border-2 border-dashed border-red-500 text-red-700 text-center font-bold text-sm tracking-wider uppercase rounded">
                CANCELLED VOUCHER {voucher.cancelledReason ? `(${voucher.cancelledReason})` : ""}
              </div>
            )}

            {/* Voucher Title */}
            <div className="voucher-title bg-slate-100 border border-slate-300 rounded p-1.5 text-center font-bold uppercase text-xs tracking-wider text-slate-800 mb-4">
              {voucherTypeLabel}
            </div>

            {/* Meta Grid */}
            <div className="meta-grid grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-xs">
              <div className="space-y-1">
                <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                  <span className="meta-label text-slate-500 font-semibold">Voucher No:</span>
                  <span className="meta-val font-mono font-bold text-slate-900">{voucher.voucherNo}</span>
                </div>
                <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                  <span className="meta-label text-slate-500 font-semibold">Date:</span>
                  <span className="meta-val font-medium">{formattedDate}</span>
                </div>
                <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                  <span className="meta-label text-slate-500 font-semibold">Reference Type:</span>
                  <span className="meta-val font-medium uppercase">{voucher.referenceType || "-"}</span>
                </div>
                {voucher.referenceDocNo && (
                  <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                    <span className="meta-label text-slate-500 font-semibold">Ref Document:</span>
                    <span className="meta-val font-mono font-bold text-amber-700">{voucher.referenceDocNo}</span>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                  <span className="meta-label text-slate-500 font-semibold">
                    {voucher.voucherType === "RECEIPT" ? "Received From:" : "Paid To / Account:"}
                  </span>
                  <span className="meta-val font-bold text-slate-900">{voucher.partyName || "-"}</span>
                </div>
                {voucher.partyPhone && (
                  <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                    <span className="meta-label text-slate-500 font-semibold">Phone:</span>
                    <span className="meta-val font-medium">{voucher.partyPhone}</span>
                  </div>
                )}
                <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                  <span className="meta-label text-slate-500 font-semibold">Payment Mode:</span>
                  <span className="meta-val font-medium uppercase">{voucher.paymentMode || "-"}</span>
                </div>
                {voucher.transactionRef && (
                  <div className="meta-row flex justify-between border-b border-dashed border-slate-200 py-1">
                    <span className="meta-label text-slate-500 font-semibold">Txn / UTR Ref:</span>
                    <span className="meta-val font-mono text-slate-700">{voucher.transactionRef}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Double Entry Table */}
            <div className="overflow-hidden border border-slate-300 rounded mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-2 text-left font-bold text-slate-700">Account / Ledger</th>
                    <th className="p-2 text-left font-bold text-slate-700">Particulars</th>
                    <th className="p-2 text-right font-bold text-slate-700 w-28">Debit (₹)</th>
                    <th className="p-2 text-right font-bold text-slate-700 w-28">Credit (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {voucher.entries && voucher.entries.length > 0 ? (
                    voucher.entries.map((entry, idx) => (
                      <tr key={idx} className="border-b border-slate-200 last:border-0">
                        <td className="p-2 font-semibold text-slate-800">{entry.accountName}</td>
                        <td className="p-2 text-slate-600">{entry.narration || "-"}</td>
                        <td className="p-2 text-right font-mono font-medium">
                          {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toFixed(2)}` : "-"}
                        </td>
                        <td className="p-2 text-right font-mono font-medium">
                          {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toFixed(2)}` : "-"}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-slate-400">
                        No ledger entries recorded
                      </td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-bold border-t-2 border-slate-300">
                    <td colSpan={2} className="p-2 text-right uppercase text-slate-700">
                      Total:
                    </td>
                    <td className="p-2 text-right font-mono text-slate-900">₹{totalDebit.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono text-slate-900">₹{totalCredit.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* In Words */}
            <div className="words-box bg-slate-50 border border-dashed border-slate-300 p-2.5 rounded text-xs italic text-slate-700 mb-3">
              <span className="font-semibold not-italic text-slate-900">Amount in Words: </span>
              {inWords}
            </div>

            {/* Narration */}
            {voucher.narration && (
              <div className="narration-box text-xs text-slate-700 mb-6 bg-amber-50/60 border border-amber-200/60 p-2 rounded">
                <span className="font-semibold text-slate-900">Narration / Notes: </span>
                <span>{voucher.narration}</span>
              </div>
            )}

            {/* Signatures */}
            <div className="sign-grid grid grid-cols-3 gap-8 mt-12 pt-6 text-center text-xs">
              <div>
                <div className="sign-line border-t border-slate-900 pt-1 font-semibold uppercase text-slate-700">
                  Prepared By
                </div>
                <div className="text-[10px] text-slate-500">{voucher.createdBy || "Accountant"}</div>
              </div>
              <div>
                <div className="sign-line border-t border-slate-900 pt-1 font-semibold uppercase text-slate-700">
                  Receiver's Signature
                </div>
              </div>
              <div>
                <div className="sign-line border-t border-slate-900 pt-1 font-semibold uppercase text-slate-700">
                  Authorized Signatory
                </div>
                <div className="text-[10px] text-slate-500">{selectedStore?.storeName || "Binayak Jeweller"}</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
