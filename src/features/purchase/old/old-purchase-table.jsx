import { Eye, Pencil, Trash, Download } from "lucide-react";

export default function OldPurchaseTable({ data, onEdit, onDelete, onDownload, onPreview }) {
  return (
    <div className="bg-white border rounded-xl overflow-hidden shadow-sm">
      <table className="w-full text-xs">
        <thead className="bg-slate-100/80 font-bold text-slate-700 border-b">
          <tr>
            <th className="p-3 text-left">Invoice No</th>
            <th className="p-3 text-left">Type</th>
            <th className="p-3 text-left">Customer / Party</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-center">Pcs</th>
            <th className="p-3 text-right">Gross Wt</th>
            <th className="p-3 text-right">Net Payable</th>
            <th className="p-3 text-right">Paid</th>
            <th className="p-3 text-right">Due</th>
            <th className="p-3 text-center">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {data.map((p) => {
            const totalPcs = p.itemsSummary?.pieces ?? (p.items?.reduce((s, it) => s + Number(it.pieces || 1), 0) || 1);
            const totalGross = p.itemsSummary?.grossWeight ?? (p.items?.reduce((s, it) => s + Number(it.grossWeight || 0), 0) || 0);
            const netAmount = p.netPayable || p.totalAmount || 0;
            const paid = p.paidAmount || 0;
            const due = p.dueAmount ?? Math.max(0, netAmount - paid);

            return (
              <tr key={p.id} className="hover:bg-slate-50 transition">
                <td className="p-3 font-semibold text-slate-800">{p.invoiceNo || "-"}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                    {p.purchaseType}
                  </span>
                </td>
                <td className="p-3 font-medium text-slate-700">{p.customerName || p.party?.name || "-"}</td>
                <td className="p-3 text-slate-500">
                  {p.date ? new Date(p.date).toLocaleDateString("en-IN") : "-"}
                </td>
                <td className="p-3 text-center font-semibold">{totalPcs}</td>
                <td className="p-3 text-right font-medium text-slate-600">{Number(totalGross).toFixed(3)}g</td>
                <td className="p-3 text-right font-bold text-slate-900">₹{Number(netAmount).toFixed(2)}</td>
                <td className="p-3 text-right font-semibold text-emerald-700">₹{Number(paid).toFixed(2)}</td>
                <td className="p-3 text-right font-bold text-red-600">
                  {due > 0 ? `₹${Number(due).toFixed(2)}` : <span className="text-slate-400 font-normal">₹0.00</span>}
                </td>

                <td className="p-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      title="Preview Purchase Invoice"
                      onClick={() => onPreview?.(p)}
                      className="p-1 hover:bg-blue-50 rounded text-blue-700 transition"
                    >
                      <Eye size={15} />
                    </button>
                    <button
                      title="Download PDF"
                      onClick={() => onDownload?.(p.id)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
                    >
                      <Download size={15} />
                    </button>
                    <button
                      title="Edit Purchase"
                      onClick={() => onEdit(p)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-600 transition"
                    >
                      <Pencil size={15} />
                    </button>
                   
                    <button
                      title="Delete Purchase"
                      onClick={() => onDelete(p.id)}
                      className="p-1 hover:bg-red-50 rounded text-red-600 transition"
                    >
                      <Trash size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
