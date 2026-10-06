import React from "react";
import { money } from "@/utils/units";
import { CheckCircle2, Clock, AlertCircle, Ban } from "lucide-react";

const STATUS_CONFIG = {
  AVAILABLE: {
    label: "Available",
    cls: "bg-emerald-50 text-emerald-700 border-emerald-300",
    icon: CheckCircle2,
  },
  PARTIALLY_ADJUSTED: {
    label: "Partially Adjusted",
    cls: "bg-amber-50 text-amber-700 border-amber-300",
    icon: Clock,
  },
  FULLY_ADJUSTED: {
    label: "Fully Adjusted",
    cls: "bg-slate-100 text-slate-600 border-slate-300",
    icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-red-50 text-red-700 border-red-300",
    icon: Ban,
  },
};

function resolveStatus(row) {
  if (row.status === "CANCELLED") return "CANCELLED";
  const amount = Number(row.amount || 0);
  const adjusted = Number(row.adjustedAmount || 0);
  const balance = Number(
    row.balanceAmount ?? Math.max(0, amount - adjusted)
  );
  if (balance <= 0.01 || adjusted >= amount - 0.01) return "FULLY_ADJUSTED";
  if (adjusted > 0) return "PARTIALLY_ADJUSTED";
  return "AVAILABLE";
}

function formatDate(value) {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString("en-IN");
}

export default function AdvanceTable({ data, loading }) {
  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-500">
        Loading customer advances...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        No customer advance records found. Advance deposits recorded via Receipt Voucher will automatically appear here.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-50/80 border-b text-slate-600 uppercase font-semibold">
          <tr>
            <th className="p-3.5">Ref No</th>
            <th className="p-3.5">Date</th>
            <th className="p-3.5">Customer Name</th>
            <th className="p-3.5">Contact Number</th>
            <th className="p-3.5">Payment Mode</th>
            <th className="p-3.5 text-right">Total Advance</th>
            <th className="p-3.5 text-right">Adjusted (Used)</th>
            <th className="p-3.5 text-right">Available Balance</th>
            <th className="p-3.5 text-center">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row) => {
            const status = resolveStatus(row);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.AVAILABLE;
            const StatusIcon = cfg.icon;
            const total = Number(row.amount || 0);
            const adjusted = Number(row.adjustedAmount || 0);
            const balance = status === "CANCELLED" ? 0 : Number(row.balanceAmount ?? Math.max(0, total - adjusted));

            return (
              <tr key={row.id} className="hover:bg-slate-50/60 transition-colors">
                <td className="p-3.5 font-mono font-bold text-slate-900">
                  ADV-{row.id}
                  {row.specification && row.specification.includes("RV-") && (
                    <div className="text-[10px] text-slate-400 font-normal">
                      {row.specification}
                    </div>
                  )}
                </td>
                <td className="p-3.5 text-slate-600">
                  {formatDate(row.receiveDate || row.date || row.createdAt)}
                </td>
                <td className="p-3.5 font-semibold text-slate-900">
                  {row.customerName || "Customer"}
                </td>
                <td className="p-3.5 font-mono text-slate-600">
                  {row.contactNumber || "-"}
                </td>
                <td className="p-3.5">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 uppercase">
                    {row.paymentMode || "CASH"}
                  </span>
                </td>
                <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                  ₹{money(total)}
                </td>
                <td className="p-3.5 text-right font-mono font-semibold text-purple-700">
                  {adjusted > 0 ? `₹${money(adjusted)}` : "-"}
                </td>
                <td className="p-3.5 text-right font-mono font-bold text-emerald-800 text-sm">
                  ₹{money(balance)}
                </td>
                <td className="p-3.5 text-center">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}
                  >
                    <StatusIcon size={12} />
                    <span>{cfg.label}</span>
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
