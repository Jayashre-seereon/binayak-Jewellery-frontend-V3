import React, { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { getPurchasePdf } from "@/api/old-purchase-api";
import { notifyError } from "@/utils/notify";
import { numberToWordsIndian } from "@/utils/numberToWords";
import InvoiceBrandHeader from "@/components/invoice-brand-header";

const money = (val) => Number(val || 0).toFixed(2);
const weightStr = (val) => Number(val || 0).toFixed(3);

const formatDateTime = (dateVal) => {
  if (!dateVal) return "-";
  const d = new Date(dateVal);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${day}/${month}/${year} / ${String(hours).padStart(2, "0")}:${minutes}:${ampm}`;
};

export default function PurchaseInvoicePreviewModal({ open, onOpenChange, purchase }) {
  const printRef = useRef(null);

  if (!purchase) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      const blob = await getPurchasePdf(purchase.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Purchase-Invoice-${purchase.invoiceNo || purchase.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      notifyError(err, "Failed to download purchase PDF invoice.");
    }
  };

  const items = purchase.items || purchase.purchaseItems || [];
  const paymentList = Array.isArray(purchase.payments) && purchase.payments.length > 0
    ? purchase.payments
    : [
        {
          paymentMode: purchase.paymentMode || "CASH",
          paymentChannel: "Cash",
          amount: purchase.paidAmount || purchase.netPayable || purchase.totalAmount || 0,
          transactionId: "-",
          description: "Purchase Settlement",
        },
      ];

  const primaryPayment = paymentList[0];
  const paymentModeName = primaryPayment?.paymentChannel || (primaryPayment?.paymentMode ? `By ${primaryPayment.paymentMode}` : (purchase.paymentMode ? `By ${purchase.paymentMode}` : "By Cash"));
  const paidAmountVal = purchase.paidAmount || paymentList.reduce((s, p) => s + Number(p.amount || 0), 0);
  const trId = primaryPayment?.transactionId || primaryPayment?.referenceNo || "-";
  const pDesc = primaryPayment?.description || primaryPayment?.narration || "Purchase Settlement Receipt";

  const totalGrossWt = items.reduce((sum, it) => sum + Number(it.grossWeight || 0), 0);
  const totalNetWt = items.reduce((sum, it) => sum + Number(it.netWeight || (Number(it.grossWeight || 0) - Number(it.stoneWeight || 0))), 0);
  const totalPcs = items.reduce((sum, it) => sum + Math.max(1, Number(it.pieces || 1)), 0);
  const totalAmountVal = purchase.grossAmount || items.reduce((sum, it) => sum + Number(it.totalAmount || 0), 0) || purchase.subtotal || 0;

  const isInterState =
    purchase.placeOfSupply &&
    purchase.placeOfSupply.trim().toUpperCase() !== "ODISHA" &&
    purchase.placeOfSupply.trim().toUpperCase() !== "";

  const addDisc = Number(purchase.discount || 0);
  const taxableAmt = Number(purchase.taxableAmount || Math.max(0, totalAmountVal - addDisc));

  const cgstP = !isInterState ? 1.5 : 0.0;
  const cgstA = Number(purchase.cgst || (!isInterState ? (taxableAmt * cgstP) / 100 : 0));
  const sgstP = !isInterState ? 1.5 : 0.0;
  const sgstA = Number(purchase.sgst || (!isInterState ? (taxableAmt * sgstP) / 100 : 0));
  const igstP = isInterState ? 3.0 : 0.0;
  const igstA = Number(purchase.igst || (isInterState ? (taxableAmt * igstP) / 100 : 0));
  const totalTaxA = Number(purchase.taxAmount || (cgstA + sgstA + igstA));

  const subTotalAmt = Number(purchase.subtotal || (taxableAmt + totalTaxA));
  const roundOffAmt = Number(purchase.roundOff || 0);
  const netPayableAmt = Number(purchase.netPayable || purchase.totalAmount || (subTotalAmt + roundOffAmt));
  const amountWords = numberToWordsIndian(netPayableAmt);
  const dueAmt = Number(purchase.dueAmount ?? Math.max(0, netPayableAmt - paidAmountVal));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] !max-w-[900px] max-h-[95vh] overflow-y-auto p-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:border-none">
        {/* ACTION BAR (Hidden in print) */}
        <div className="flex items-center justify-between border-b px-6 py-3 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Purchase Invoice: {purchase.invoiceNo || `#${purchase.id}`}</h2>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" onClick={handlePrint} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {/* INVOICE SHEET CONTAINER */}
        <div
          ref={printRef}
          className="p-8 bg-white text-black font-sans text-xs leading-tight print:p-4 print:text-[11px]"
          style={{ minHeight: "800px" }}
        >
          <InvoiceBrandHeader store={purchase.store} />
          {/* HEADER */}
          <div className="relative mb-4 mt-4">
            <div className="text-center">
              <h1 className="text-lg font-bold tracking-wider uppercase">PURCHASE INVOICE</h1>
            </div>
            <div className="absolute right-0 top-0 text-right">
              <div className="text-xs font-semibold text-gray-700">
                {purchase.store?.storeName || "Bhubaneswar"} Branch
              </div>
            </div>
          </div>

          {/* CUSTOMER & INVOICE DETAILS GRID */}
          <div className="grid grid-cols-2 gap-4 pb-3 mb-2 text-xs border-b border-gray-300">
            {/* LEFT: SUPPLIER / CUSTOMER DETAILS */}
            <div className="space-y-1">
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">Name</span>
                <span>:</span>
                <span className="font-bold uppercase">{purchase.party?.name || purchase.customerName || "-"}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">Address</span>
                <span>:</span>
                <span>{purchase.party?.address || purchase.address || "-"}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">City</span>
                <span>:</span>
                <span>{purchase.party?.city || purchase.customerCity || "Bhubaneswar - 766001"}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">Contact No.</span>
                <span>:</span>
                <span>{purchase.party?.phone || purchase.customerPhone || "-"}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">ID / PAN No.</span>
                <span>:</span>
                <span>{purchase.customerIdNumber || purchase.party?.pan || ""}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">GST No.</span>
                <span>:</span>
                <span>{purchase.party?.gst || ""}</span>
              </div>
              <div className="grid grid-cols-[85px_10px_1fr]">
                <span className="font-semibold text-gray-700">State</span>
                <span>:</span>
                <span className="uppercase">{purchase.placeOfSupply || purchase.party?.state || purchase.store?.state || "ODISHA"}</span>
              </div>
            </div>

            {/* RIGHT: STORE & INVOICE DETAILS */}
            <div className="space-y-1">
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span className="font-semibold text-gray-700">CIN No.</span>
                <span>:</span>
                <span>{purchase.store?.cinNo || "U36911OR2005PTCC008217"}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span className="font-semibold text-gray-700">GST No.</span>
                <span>:</span>
                <span>{purchase.store?.gstNo || "21AAFCA3795A1Z5"}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span className="font-semibold text-gray-700">Place of Supply</span>
                <span>:</span>
                <span className="uppercase">{purchase.placeOfSupply || "ODISHA"}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span className="font-semibold text-gray-700">Invoice No.</span>
                <span>:</span>
                <span className="font-bold">{purchase.invoiceNo || purchase.referenceNo || `#${purchase.id}`}</span>
              </div>
              <div className="grid grid-cols-[105px_10px_1fr]">
                <span className="font-semibold text-gray-700">Date</span>
                <span>:</span>
                <span>{formatDateTime(purchase.date)}</span>
              </div>
            </div>
          </div>

          {/* ITEM DETAILS TABLE */}
          <div className="border border-gray-400 mb-3">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-400 font-bold text-center">
                  <th className="p-1.5 border-r border-gray-400 w-8">Sr.<br />No.</th>
                  <th className="p-1.5 border-r border-gray-400 text-left min-w-[140px]">Particulars</th>
                  <th className="p-1.5 border-r border-gray-400 w-14">HSN</th>
                  <th className="p-1.5 border-r border-gray-400 w-12">Purity</th>
                  <th className="p-1.5 border-r border-gray-400 w-8">Pcs</th>
                  <th className="p-1.5 border-r border-gray-400 w-16 text-right">Gross Wt.<br />[Gm.]</th>
                  <th className="p-1.5 border-r border-gray-400 w-16 text-right">Net Wt.<br />[Gm.]</th>
                  <th className="p-1.5 border-r border-gray-400 w-18 text-right">Rate<br />[₹/Gm]</th>
                  <th className="p-1.5 border-r border-gray-400 w-18 text-right">Metal<br />Amt</th>
                  <th className="p-1.5 border-r border-gray-400 w-14 text-right">Other/Stn<br />Amt</th>
                  <th className="p-1.5 text-right w-20">Total<br />Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const prodName = (it.item?.name || it.product?.name || it.metal?.name || "JEWELLERY").toUpperCase();
                  const codeStr = it.purchaseItemCode || (it.id ? `#${it.id}` : "");
                  const purityStr = it.purityMaster?.name || (it.purity ? `${it.purity}%` : "22K");
                  const huidStr = it.huidNo || "";
                  const grossVal = Number(it.grossWeight || 0);
                  const netVal = Number(it.netWeight || (grossVal - Number(it.stoneWeight || 0)));
                  const rateVal = Number(it.rate || 0);
                  const metalAmtVal = Number(it.metalAmount || (netVal * rateVal));
                  const otherAmtVal = Number(it.stoneAmount || 0) + Number(it.otherAmount || 0);
                  const totalAmtVal = Number(it.totalAmount || (metalAmtVal + otherAmtVal - Number(it.discount || 0)));

                  return (
                    <tr key={idx} className="border-b border-gray-300 align-top">
                      <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                      <td className="p-1.5 border-r border-gray-300">
                        <div className="font-bold">{prodName}</div>
                        <div className="text-[10px] text-gray-500 flex items-center gap-1.5">
                          {codeStr && <span>{codeStr}</span>}
                          {huidStr && <span className="font-mono font-semibold text-blue-900">| HUID: {huidStr}</span>}
                        </div>
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{it.hsnCode || "711319"}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{purityStr}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{it.pieces || 1}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{weightStr(grossVal)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{weightStr(netVal)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{money(rateVal)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{money(metalAmtVal)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{money(otherAmtVal)}</td>
                      <td className="p-1.5 text-right font-bold">{money(totalAmtVal)}</td>
                    </tr>
                  );
                })}
                {/* TOTAL ROW */}
                <tr className="border-t border-gray-400 bg-gray-50 font-bold">
                  <td colSpan={4} className="p-1.5 border-r border-gray-400">Total</td>
                  <td className="p-1.5 border-r border-gray-400 text-center">{totalPcs}</td>
                  <td className="p-1.5 border-r border-gray-400 text-right">{weightStr(totalGrossWt)}</td>
                  <td className="p-1.5 border-r border-gray-400 text-right">{weightStr(totalNetWt)}</td>
                  <td colSpan={3} className="p-1.5 border-r border-gray-400"></td>
                  <td className="p-1.5 text-right">{money(totalAmountVal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* LOWER SECTION GRID */}
          <div className="grid grid-cols-[1.3fr_1fr] gap-4">
            {/* LOWER LEFT COLUMN */}
            <div className="space-y-3">
              {/* PAYMENT DETAILS */}
              <div className="space-y-0.5">
                <div className="font-bold text-xs">{paymentModeName.startsWith("By") ? paymentModeName : `By ${paymentModeName}`}</div>
                <div className="font-bold text-xs">{money(paidAmountVal)}</div>
                <div className="text-[10px] text-gray-600">
                  Payment : {primaryPayment?.paymentChannel || purchase.paymentMode || "Cash"} | Ref/Tr.Id: {trId}, {pDesc}
                </div>
              </div>

              {/* HSN SUMMARY TABLE */}
              <div className="border border-gray-400">
                <div className="text-center font-bold text-[11px] py-0.5 bg-gray-100 border-b border-gray-400">
                  HSN SUMMARY
                </div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300 font-bold text-center">
                      <th className="p-1 border-r border-gray-300">Sr.</th>
                      <th className="p-1 border-r border-gray-300">HSN/SAC</th>
                      <th className="p-1 border-r border-gray-300 text-right">CGST%</th>
                      <th className="p-1 border-r border-gray-300 text-right">CGST Amt.</th>
                      <th className="p-1 border-r border-gray-300 text-right">SGST%</th>
                      <th className="p-1 border-r border-gray-300 text-right">SGST Amt.</th>
                      <th className="p-1 border-r border-gray-300 text-right">IGST%</th>
                      <th className="p-1 border-r border-gray-300 text-right">IGST Amt.</th>
                      <th className="p-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 border-r border-gray-300 text-center">1</td>
                      <td className="p-1 border-r border-gray-300 text-center">{items[0]?.hsnCode || "711319"}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{Number(cgstP).toFixed(3)}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{money(cgstA)}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{Number(sgstP).toFixed(3)}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{money(sgstA)}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{Number(igstP).toFixed(2)}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{money(igstA)}</td>
                      <td className="p-1 text-right">{money(totalTaxA)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* INVOICE VALUE IN WORDS */}
              <div className="text-xs">
                <span className="font-bold">Invoice Value [ In Words ] : </span>
                <span className="italic">{amountWords}</span>
              </div>

              {/* NARRATION */}
              <div className="space-y-0.5 text-xs">
                <div><span className="font-bold">Narration : </span><span>{purchase.narration || ""}</span></div>
              </div>

              {/* THANK YOU & TERMS */}
              <div className="pt-2">
                <div className="font-bold text-xs mb-2">
                  {purchase.store?.tagline || `Thank You For Visit ${purchase.store?.storeName || "Binayak Jewellers"} ...`}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight space-y-0.5">
                  <div>I have verified the Weight & Pieces & found ok</div>
                  <div>I hereby agree to the Terms & Conditions mentioned backside</div>
                </div>
                <div className="pt-6 font-bold text-xs">Supplier / Customer Signature:</div>
              </div>
            </div>

            {/* LOWER RIGHT COLUMN: AMOUNT BREAKDOWN */}
            <div className="border border-gray-400 p-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Gross Amount</span>
                <span className="font-semibold">{money(totalAmountVal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount [-]</span>
                <span>{money(addDisc)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-b border-gray-300 py-1">
                <span>Taxable Amount</span>
                <span>{money(taxableAmt)}</span>
              </div>
              {!isInterState ? (
                <>
                  <div className="flex justify-between">
                    <span>CGST Amt. [ + ]</span>
                    <span>{money(cgstA)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST Amt. [ + ]</span>
                    <span>{money(sgstA)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between">
                  <span>IGST Amt. [ + ]</span>
                  <span>{money(igstA)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-b border-gray-300 py-1">
                <span>Sub Total</span>
                <span>{money(subTotalAmt)}</span>
              </div>
              <div className="flex justify-between">
                <span>Round Off [ +/- ]</span>
                <span>{money(roundOffAmt)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t-2 border-b-2 border-black py-1 bg-gray-50">
                <span>Net Payable</span>
                <span>{money(netPayableAmt)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-semibold pt-1">
                <span>Paid Amount</span>
                <span>{money(paidAmountVal)}</span>
              </div>

              <div className="flex justify-between text-red-600 font-bold">
                <span>Due Amount</span>
                <span>{money(dueAmt)}</span>
              </div>

              <div className="pt-2 text-xs">
                <div className="font-bold">Staff : {purchase.employee?.name || purchase.store?.storeName || "Admin"}</div>
              </div>

              <div className="pt-6 text-right">
                <div className="text-[10px] text-gray-500">For {purchase.store?.storeName || "Binayak Jewellers"}</div>
                <div className="pt-6 font-bold text-xs">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
