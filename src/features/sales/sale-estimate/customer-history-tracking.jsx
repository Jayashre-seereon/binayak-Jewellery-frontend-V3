import { History } from "lucide-react";

const TAB_DEFS = [
  { key: "logs", label: "Adjustment History Logs" },
  { key: "advances", label: "All Advance Receipts" },
  { key: "oldGold", label: "All Old Jewellery Invoices" },
  { key: "sales", label: "Past Sales" },
];

const formatDateTime = (value) => (value ? new Date(value).toLocaleString("en-IN") : "-");
const formatDate = (value) => (value ? new Date(value).toLocaleDateString("en-IN") : "-");

export default function CustomerHistoryTracking({
  customerName,
  customerPhone,
  customerId,
  availableAdvances = [],
  availableOldJewellery = [],
  allAdvancesHistory = [],
  allOldJewelleryHistory = [],
  adjustmentLogsHistory = [],
  pastSalesHistory = [],
  activeTab,
  onTabChange,
  formatMoney,
}) {
  const money = typeof formatMoney === "function" ? formatMoney : (value) => Number(value || 0).toFixed(2);

  return (
    <>
      <div className="border-b border-slate-200 px-6 py-4 bg-slate-50 flex flex-row items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            Customer History & Adjustment Tracking
          </h3>
          <p className="text-xs text-slate-500">
            Customer: <strong>{customerName || "Customer"}</strong> ({customerPhone || "-"}) | ID: #{customerId || "-"}
          </p>
        </div>
        <div className="flex gap-2 text-xs">
          <div className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded border border-emerald-200 font-medium">
            Unused Advance: <strong>₹{money(availableAdvances.reduce((s, a) => s + Number(a.balanceAmount || 0), 0))}</strong>
          </div>
          <div className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded border border-amber-200 font-medium">
            Unused Old Gold: <strong>₹{money(availableOldJewellery.reduce((s, oj) => s + Number(oj.balanceAmount || 0), 0))}</strong>
          </div>
        </div>
      </div>

      <div className="flex border-b border-slate-200 px-6 bg-slate-50 text-xs font-semibold">
        {TAB_DEFS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`py-2.5 px-4 border-b-2 transition ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600 bg-white"
                : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {tab.label} (
            {tab.key === "logs"
              ? adjustmentLogsHistory.length
              : tab.key === "advances"
                ? allAdvancesHistory.length
                : tab.key === "oldGold"
                  ? allOldJewelleryHistory.length
                  : pastSalesHistory.length}
            )
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6 text-xs">
        {activeTab === "logs" && (
          <div className="space-y-3">
            {adjustmentLogsHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">No previous adjustment logs found for this customer.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-left">
                    <th className="p-2.5">Date & Time</th>
                    <th className="p-2.5">Type</th>
                    <th className="p-2.5">Reference Doc</th>
                    <th className="p-2.5">Sale Invoice</th>
                    <th className="p-2.5 text-right">Adjusted (₹)</th>
                    <th className="p-2.5 text-right">Remaining Bal (₹)</th>
                    <th className="p-2.5">Cashier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adjustmentLogsHistory.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-slate-600">{formatDateTime(log.adjustmentDate)}</td>
                      <td className="p-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.adjustmentType === "ADVANCE"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {log.adjustmentType === "ADVANCE" ? "Advance Adjustment" : "Old Jewellery"}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-blue-700 font-semibold">{log.referenceDocNo || `#${log.referenceId}`}</td>
                      <td className="p-2.5 font-semibold text-slate-900">{log.saleInvoiceNo || `#${log.saleId}`}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">₹{money(log.adjustedAmount)}</td>
                      <td className="p-2.5 text-right font-semibold text-slate-700">₹{money(log.remainingBalance)}</td>
                      <td className="p-2.5 text-slate-500">{log.cashierName || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "advances" && (
          <div className="space-y-3">
            {allAdvancesHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">No advance payment records found.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-left">
                    <th className="p-2.5">Receipt No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Total Amount (₹)</th>
                    <th className="p-2.5 text-right">Used Amount (₹)</th>
                    <th className="p-2.5 text-right">Available Bal (₹)</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Used In Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allAdvancesHistory.map((adv) => (
                    <tr key={adv.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-blue-700">{adv.receiptNo}</td>
                      <td className="p-2.5 text-slate-600">{formatDate(adv.date)}</td>
                      <td className="p-2.5 text-right font-semibold">₹{money(adv.totalAmount)}</td>
                      <td className="p-2.5 text-right text-slate-600">₹{money(adv.adjustedAmount)}</td>
                      <td className="p-2.5 text-right font-bold text-emerald-700">₹{money(adv.balanceAmount)}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            adv.status === "FULLY_ADJUSTED"
                              ? "bg-slate-100 text-slate-600"
                              : adv.status === "PARTIALLY_ADJUSTED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {adv.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {adv.adjustments?.length > 0 ? (
                          <div className="space-y-0.5">
                            {adv.adjustments.map((a) => (
                              <div key={a.id} className="text-[11px]">
                                {a.invoiceNo} (₹{money(a.amount)}) on {formatDate(a.saleDate)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "oldGold" && (
          <div className="space-y-3">
            {allOldJewelleryHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">No old jewellery purchase records found.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-left">
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Items Summary</th>
                    <th className="p-2.5 text-right">Valuation (₹)</th>
                    <th className="p-2.5 text-right">Used Value (₹)</th>
                    <th className="p-2.5 text-right">Available Bal (₹)</th>
                    <th className="p-2.5 text-center">Status</th>
                    <th className="p-2.5">Used In Invoices</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {allOldJewelleryHistory.map((oj) => (
                    <tr key={oj.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-amber-700">{oj.invoiceNo}</td>
                      <td className="p-2.5 text-slate-600">{formatDate(oj.date)}</td>
                      <td className="p-2.5 text-slate-800">{oj.itemSummary}</td>
                      <td className="p-2.5 text-right font-semibold">₹{money(oj.totalValuation)}</td>
                      <td className="p-2.5 text-right text-slate-600">₹{money(oj.adjustedAmount)}</td>
                      <td className="p-2.5 text-right font-bold text-amber-700">₹{money(oj.balanceAmount)}</td>
                      <td className="p-2.5 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            oj.status === "FULLY_ADJUSTED"
                              ? "bg-slate-100 text-slate-600"
                              : oj.status === "PARTIALLY_ADJUSTED"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          }`}
                        >
                          {oj.status}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-500">
                        {oj.adjustments?.length > 0 ? (
                          <div className="space-y-0.5">
                            {oj.adjustments.map((a) => (
                              <div key={a.id} className="text-[11px]">
                                {a.invoiceNo} (₹{money(a.amount)}) on {formatDate(a.saleDate)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "sales" && (
          <div className="space-y-3">
            {pastSalesHistory.length === 0 ? (
              <p className="text-center text-slate-400 py-8 italic">No previous sales invoices found for this customer.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-left">
                    <th className="p-2.5">Invoice No</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5 text-right">Gross Total (₹)</th>
                    <th className="p-2.5 text-right">Adv Adj (₹)</th>
                    <th className="p-2.5 text-right">Old Gold Adj (₹)</th>
                    <th className="p-2.5 text-right">Net Payable (₹)</th>
                    <th className="p-2.5 text-right">Paid (₹)</th>
                    <th className="p-2.5 text-right">Due (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pastSalesHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-bold text-blue-700">{s.invoiceNo}</td>
                      <td className="p-2.5 text-slate-600">{formatDate(s.saleDate)}</td>
                      <td className="p-2.5 text-right font-semibold">₹{money(s.subTotal || s.grossAmount)}</td>
                      <td className="p-2.5 text-right text-emerald-700 font-medium">{Number(s.advanceAmount || 0) > 0 ? `₹${money(s.advanceAmount)}` : "-"}</td>
                      <td className="p-2.5 text-right text-amber-700 font-medium">{Number(s.oldGoldAmount || 0) > 0 ? `₹${money(s.oldGoldAmount)}` : "-"}</td>
                      <td className="p-2.5 text-right font-bold text-slate-900">₹{money(s.netPayable)}</td>
                      <td className="p-2.5 text-right text-emerald-700 font-semibold">₹{money(s.paidAmount)}</td>
                      <td className="p-2.5 text-right text-red-600 font-bold">{Number(s.dueAmount || 0) > 0 ? `₹${money(s.dueAmount)}` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </>
  );
}
