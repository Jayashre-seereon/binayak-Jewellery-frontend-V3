import { useRef } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";
import { getSalePdf } from "./sale-estimate-api";
import { notifyError } from "@/utils/notify";
import { formatCharge, formatWeight } from "@/utils/units";
import { numberToWordsIndian } from "@/utils/numberToWords";
import InvoiceBrandHeader from "@/components/invoice-brand-header";
import SaleCancelAction from "./sale-cancel-action";

const money = (val) => Number(val || 0).toFixed(2);

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
  return `${day}/${month}/${year} ${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
};

function Row({ label, children, labelWidth = "85px" }) {
  return (
    <div className="grid" style={{ gridTemplateColumns: `${labelWidth} 10px 1fr` }}>
      <span className="font-semibold text-gray-700">{label}</span>
      <span>:</span>
      <span>{children}</span>
    </div>
  );
}

/**
 * On-screen copy of the tax invoice. Renders exactly what the server stored (amounts, GST split,
 * payments); nothing is re-derived or defaulted, so it always matches the PDF and the ledger.
 */
export default function SalesInvoicePreviewModal({ open, onOpenChange, sale, onCancelled }) {
  const printRef = useRef(null);

  if (!sale) return null;

  const handleDownload = async () => {
    try {
      const blob = await getSalePdf(sale.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${sale.invoiceNo || sale.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    } catch (err) {
      notifyError(err, "Failed to download PDF invoice.");
    }
  };

  const items = sale.items || [];
  const payments = Array.isArray(sale.payments) ? sale.payments : [];
  const isCancelled = sale.status === "CANCELLED";

  const totalGrossWt = items.reduce((sum, it) => sum + Number(it.grossWeight || 0), 0);
  const totalNetWt = items.reduce((sum, it) => sum + Number(it.netWeight || 0), 0);
  const totalAmountVal = Number(sale.grossAmount || items.reduce((sum, it) => sum + Number(it.totalAmount || 0), 0));

  const cgstP = Number(sale.cgstPercent || 0);
  const cgstA = Number(sale.cgstAmount || 0);
  const sgstP = Number(sale.sgstPercent || 0);
  const sgstA = Number(sale.sgstAmount || 0);
  const igstP = Number(sale.igstPercent || 0);
  const igstA = Number(sale.igstAmount || 0);
  const totalTaxA = Number(sale.totalTax ?? cgstA + sgstA + igstA);
  const isInter = sale.gstType ? sale.gstType === "INTER" : igstA > 0 && cgstA === 0 && sgstA === 0;
  const showIntraRows = !isInter || cgstA > 0 || sgstA > 0;
  const showInterRow = isInter || igstA > 0;

  const offerDisc = Number(sale.offerDiscount || 0);
  const addDisc = Number(sale.discount || 0);
  const taxableAmt = Number(sale.taxableAmount || 0);
  const subTotalAmt = Number(sale.subTotal || 0);
  const advanceAmt = Number(sale.advanceAmount || 0);
  const oldGoldAmt = Number(sale.oldGoldAmount || 0);
  const lessUrdAmt = Number(sale.lessUrd || 0);
  const roundOffAmt = Number(sale.roundOff || 0);
  const netPayableAmt = Number(sale.netPayable || 0);
  const paidAmountVal = Number(sale.paidAmount ?? 0);
  const dueAmountVal = Number(sale.dueAmount ?? Math.max(0, netPayableAmt - paidAmountVal));
  const storeGstin = sale.storeGst || sale.store?.gstNo || "";
  const storeCin = sale.cinNo || sale.store?.cinNo || "";
  const hsnCodes = [...new Set(items.map((it) => it.hsnCode || it.inventory?.hsnCode).filter(Boolean))].join(", ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[95vw] !max-w-[900px] max-h-[95vh] overflow-y-auto p-0 print:p-0 print:max-w-none print:w-full print:shadow-none print:border-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 sm:px-6 py-3 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Tax Invoice: {sale.invoiceNo}</h2>
            {isCancelled && (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700">Cancelled</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 pr-8">
            <SaleCancelAction sale={sale} onCancelled={onCancelled} variant="button" />
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="h-4 w-4" /> Download PDF
            </Button>
            <Button size="sm" onClick={() => window.print()} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        <div ref={printRef} className="p-4 sm:p-8 bg-white text-black font-sans text-xs leading-tight print:p-4 print:text-[11px]" style={{ minHeight: "800px" }}>
          {isCancelled && (
            <div className="mb-3 rounded border-2 border-red-400 bg-red-50 px-3 py-2 text-center text-sm font-bold uppercase tracking-wider text-red-700">
              Cancelled{sale.cancelledAt ? ` on ${new Date(sale.cancelledAt).toLocaleString("en-IN")}` : ""}
              {sale.cancelledReason ? (
                <div className="text-xs font-medium normal-case tracking-normal">Reason: {sale.cancelledReason}</div>
              ) : null}
            </div>
          )}
          <InvoiceBrandHeader store={sale.store} />

          <div className="relative mb-4 mt-4">
            <div className="text-center">
              <h1 className="text-lg font-bold tracking-wider uppercase">Tax Invoice</h1>
            </div>
            {sale.store?.storeName && (
              <div className="absolute right-0 top-0 text-right text-xs font-semibold text-gray-700">{sale.store.storeName}</div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-3 mb-2 text-xs border-b border-gray-300">
            <div className="space-y-1">
              {(sale.customer?.customerCode || sale.customerId) && (
                <Row label="Customer ID">
                  <span className="font-bold text-blue-700">{sale.customer?.customerCode || `#${sale.customerId}`}</span>
                </Row>
              )}
              <Row label="Name">
                <span className="font-bold uppercase">{sale.party?.name || sale.customerName || "-"}</span>
              </Row>
              <Row label="Address">{sale.party?.address || sale.customerAddress || "-"}</Row>
              <Row label="City">{sale.customerCity || "-"}</Row>
              <Row label="Contact No.">{sale.party?.phone || sale.customerPhone || "-"}</Row>
              <Row label="PAN No.">{sale.customerPan || "-"}</Row>
              <Row label="GST No.">{sale.party?.gst || sale.customerGst || "-"}</Row>
              <Row label="State">
                <span className="uppercase">{sale.customerState || sale.placeOfSupply || "-"}</span>
              </Row>
            </div>

            <div className="space-y-1">
              <Row label="CIN No." labelWidth="105px">
                {storeCin || "-"}
              </Row>
              <Row label="GST No." labelWidth="105px">
                <span className={storeGstin ? "" : "text-red-600"}>{storeGstin || "Not set in store master"}</span>
              </Row>
              <Row label="Place of Supply" labelWidth="105px">
                <span className="uppercase">{sale.placeOfSupply || "-"}</span>
              </Row>
              <Row label="Invoice No." labelWidth="105px">
                <span className="font-bold">{sale.invoiceNo}</span>
              </Row>
              <Row label="Date / Time" labelWidth="105px">
                {formatDateTime(sale.saleDate)}
              </Row>
            </div>
          </div>

          <div className="border border-gray-400 mb-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-400 font-bold text-center">
                  <th className="p-1.5 border-r border-gray-400 w-8">
                    Sr.
                    <br />
                    No.
                  </th>
                  <th className="p-1.5 border-r border-gray-400 text-left min-w-[140px]">Particulars</th>
                  <th className="p-1.5 border-r border-gray-400 w-14">HSN</th>
                  <th className="p-1.5 border-r border-gray-400 w-12">Purity</th>
                  <th className="p-1.5 border-r border-gray-400 w-8">Pcs</th>
                  <th className="p-1.5 border-r border-gray-400 w-16 text-right">Gross Wt.</th>
                  <th className="p-1.5 border-r border-gray-400 w-16 text-right">Net Wt.</th>
                  <th className="p-1.5 border-r border-gray-400 text-right">Rate</th>
                  <th className="p-1.5 border-r border-gray-400 text-right">Making</th>
                  <th className="p-1.5 border-r border-gray-400 w-14 text-right">Stone / Other</th>
                  <th className="p-1.5 text-right w-20">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => {
                  const inv = it.inventory;
                  const prodName = String(it.particulars || inv?.item?.name || inv?.product?.name || "-").toUpperCase();
                  const codeStr = it.itemCode || inv?.barcodeNo || inv?.tagNo || inv?.inventoryCode || "";
                  const purityStr = it.purityName || inv?.purityMaster?.name || (it.purity ? String(it.purity) : "-");
                  const huidStr = it.huidNo || inv?.huidNo || "";
                  return (
                    <tr key={it.id || idx} className="border-b border-gray-300 align-top">
                      <td className="p-1.5 border-r border-gray-300 text-center">{idx + 1}</td>
                      <td className="p-1.5 border-r border-gray-300">
                        <div className="font-bold">{prodName}</div>
                        <div className="text-[10px] text-gray-500 flex flex-wrap items-center gap-1.5">
                          {codeStr && <span>{codeStr}</span>}
                          {huidStr && <span className="font-mono font-semibold text-blue-900">| HUID: {huidStr}</span>}
                        </div>
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{it.hsnCode || inv?.hsnCode || "-"}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{purityStr}</td>
                      <td className="p-1.5 border-r border-gray-300 text-center">{it.pieces || 1}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{formatWeight(it.grossWeight)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{formatWeight(it.netWeight)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{money(it.rate)}</td>
                      <td className="p-1.5 border-r border-gray-300 text-right">
                        <div>{money(it.makingCharges)}</div>
                        <div className="text-[10px] text-gray-500">{formatCharge(it.makingCharges, it.makingChargeType, it.makingChargeRate)}</div>
                      </td>
                      <td className="p-1.5 border-r border-gray-300 text-right">{money(Number(it.otherCharges || 0) + Number(it.stoneAmount || 0))}</td>
                      <td className="p-1.5 text-right font-bold">{money(it.totalAmount)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t border-gray-400 bg-gray-50 font-bold">
                  <td colSpan={5} className="p-1.5 border-r border-gray-400">
                    Total
                  </td>
                  <td className="p-1.5 border-r border-gray-400 text-right">{formatWeight(totalGrossWt)}</td>
                  <td className="p-1.5 border-r border-gray-400 text-right">{formatWeight(totalNetWt)}</td>
                  <td colSpan={3} className="p-1.5 border-r border-gray-400"></td>
                  <td className="p-1.5 text-right">{money(totalAmountVal)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1.3fr_1fr] gap-4">
            <div className="space-y-3">
              <div className="space-y-0.5 text-xs">
                <div className="font-bold">Payment Details</div>
                {payments.length === 0 ? (
                  <div className="text-gray-600">{netPayableAmt > 0 ? "Unpaid — full amount on credit" : "No payment collected"}</div>
                ) : (
                  payments.map((p, i) => {
                    const ref = p.transactionId || p.referenceNo;
                    return (
                      <div key={p.id || i} className="flex justify-between gap-2">
                        <span>
                          {p.paymentMode}
                          {p.paymentChannel ? ` · ${p.paymentChannel}` : ""}
                          {ref ? <span className="text-[10px] text-gray-500"> · Ref {ref}</span> : null}
                        </span>
                        <span className="font-semibold">{money(p.amount)}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="border border-gray-400 overflow-x-auto">
                <div className="text-center font-bold text-[11px] py-0.5 bg-gray-100 border-b border-gray-400">HSN SUMMARY</div>
                <table className="w-full text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-300 font-bold text-center">
                      <th className="p-1 border-r border-gray-300">HSN/SAC</th>
                      <th className="p-1 border-r border-gray-300 text-right">Taxable</th>
                      {showIntraRows && (
                        <>
                          <th className="p-1 border-r border-gray-300 text-right">CGST {cgstP}%</th>
                          <th className="p-1 border-r border-gray-300 text-right">SGST {sgstP}%</th>
                        </>
                      )}
                      {showInterRow && <th className="p-1 border-r border-gray-300 text-right">IGST {igstP}%</th>}
                      <th className="p-1 text-right">Total Tax</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-1 border-r border-gray-300 text-center">{hsnCodes || "-"}</td>
                      <td className="p-1 border-r border-gray-300 text-right">{money(taxableAmt)}</td>
                      {showIntraRows && (
                        <>
                          <td className="p-1 border-r border-gray-300 text-right">{money(cgstA)}</td>
                          <td className="p-1 border-r border-gray-300 text-right">{money(sgstA)}</td>
                        </>
                      )}
                      {showInterRow && <td className="p-1 border-r border-gray-300 text-right">{money(igstA)}</td>}
                      <td className="p-1 text-right">{money(totalTaxA)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="text-xs">
                <span className="font-bold">Invoice Value [ In Words ] : </span>
                <span className="italic">{sale.amountInWords || numberToWordsIndian(netPayableAmt)}</span>
              </div>

              <div className="space-y-0.5 text-xs">
                <div>
                  <span className="font-bold">Narration : </span>
                  <span>{sale.narration || ""}</span>
                </div>
                {sale.irnNo && (
                  <div>
                    <span className="font-bold">IRN No. : </span>
                    <span>{sale.irnNo}</span>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <div className="font-bold text-xs mb-2">
                  {sale.store?.tagline || `Thank you for visiting ${sale.store?.storeName || "us"}`}
                </div>
                <div className="text-[10px] text-gray-500 leading-tight space-y-0.5">
                  <div>I have verified the Weight & Pieces & found ok</div>
                  <div>I hereby agree to the Terms & Conditions mentioned backside</div>
                </div>
                <div className="pt-6 font-bold text-xs">Customer Signature:</div>
              </div>
            </div>

            <div className="border border-gray-400 p-2.5 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Gross Amount</span>
                <span className="font-semibold">{money(totalAmountVal)}</span>
              </div>
              <div className="flex justify-between">
                <span>Offer Discount [-]</span>
                <span>{money(offerDisc)}</span>
              </div>
              <div className="flex justify-between">
                <span>Discount [-]</span>
                <span>{money(addDisc)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-b border-gray-300 py-1">
                <span>Taxable Amount</span>
                <span>{money(taxableAmt)}</span>
              </div>
              {showIntraRows && (
                <>
                  <div className="flex justify-between">
                    <span>CGST [ + ] ({cgstP}%)</span>
                    <span>{money(cgstA)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>SGST [ + ] ({sgstP}%)</span>
                    <span>{money(sgstA)}</span>
                  </div>
                </>
              )}
              {showInterRow && (
                <div className="flex justify-between">
                  <span>IGST [ + ] ({igstP}%)</span>
                  <span>{money(igstA)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold border-t border-b border-gray-300 py-1">
                <span>Sub Total</span>
                <span>{money(subTotalAmt)}</span>
              </div>
              {advanceAmt > 0 && (
                <div className="flex justify-between text-emerald-700 font-medium">
                  <span>Advance Adj. [-]</span>
                  <span>{money(advanceAmt)}</span>
                </div>
              )}
              {oldGoldAmt > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Old Jewellery [-]</span>
                  <span>{money(oldGoldAmt)}</span>
                </div>
              )}
              {lessUrdAmt > 0 && (
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>Less URD [-]</span>
                  <span>{money(lessUrdAmt)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Round Off [ +/- ]</span>
                <span>{money(roundOffAmt)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm border-t-2 border-b-2 border-black py-1 bg-gray-50">
                <span>Net Payable</span>
                <span>{money(netPayableAmt)}</span>
              </div>
              <div className="flex justify-between font-semibold text-emerald-700">
                <span>Paid Amount</span>
                <span>{money(paidAmountVal)}</span>
              </div>
              {dueAmountVal > 0.009 && (
                <div className="flex justify-between font-bold text-red-600">
                  <span>Due Amount</span>
                  <span>{money(dueAmountVal)}</span>
                </div>
              )}
              {sale.cashierName && <div className="pt-2 text-xs font-bold">Cashier : {sale.cashierName}</div>}
              <div className="pt-6 text-right">
                {sale.store?.storeName && <div className="text-[10px] text-gray-500">For {sale.store.storeName}</div>}
                <div className="pt-6 font-bold text-xs">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
