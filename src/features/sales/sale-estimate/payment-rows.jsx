import { Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHANNELS_BY_MODE,
  DEFAULT_CHANNEL,
  PAYMENT_MODES,
  REFERENCE_HINT,
  emptyPayment,
} from "./payment-config";

export default function PaymentRows({ payments, onChange, netPayable, formatMoney, error }) {
  const update = (idx, patch) => onChange(payments.map((p, i) => (i === idx ? { ...p, ...patch } : p)));

  const fillBalance = () => {
    const others = payments.slice(1).reduce((s, p) => s + (Number(p.amount) > 0 ? Number(p.amount) : 0), 0);
    const first = Math.max(0, Math.round((netPayable - others) * 100) / 100);
    onChange(payments.map((p, i) => (i === 0 ? { ...p, amount: first } : p)));
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-blue-600" /> Payment Collection
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange([...payments, emptyPayment("")])}
          className="text-xs text-blue-600 hover:text-blue-700 font-semibold h-7 gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add Payment Mode
        </Button>
      </div>

      <div className="space-y-2">
        {payments.map((p, idx) => {
          const channels = CHANNELS_BY_MODE[p.paymentMode] || [];
          return (
            <div
              key={idx}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded border border-slate-200 items-end"
            >
              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Mode</label>
                <select
                  className="h-8 w-full rounded border border-slate-300 px-2 text-xs bg-white"
                  value={p.paymentMode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    update(idx, { paymentMode: mode, paymentChannel: DEFAULT_CHANNEL[mode] || "" });
                  }}
                >
                  {PAYMENT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Channel</label>
                {channels.length ? (
                  <select
                    className="h-8 w-full rounded border border-slate-300 px-2 text-xs bg-white"
                    value={p.paymentChannel || ""}
                    onChange={(e) => update(idx, { paymentChannel: e.target.value })}
                  >
                    {!DEFAULT_CHANNEL[p.paymentMode] && <option value="">-- Select --</option>}
                    {channels.map((ch) => (
                      <option key={ch} value={ch}>
                        {ch}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    placeholder={p.paymentMode === "CHEQUE" ? "Bank name" : "Details"}
                    value={p.paymentChannel || ""}
                    onChange={(e) => update(idx, { paymentChannel: e.target.value })}
                    className="h-8 text-xs"
                  />
                )}
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Amount (₹)</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={p.amount}
                  onChange={(e) => update(idx, { amount: e.target.value })}
                  className="h-8 text-xs font-bold text-slate-900"
                />
              </div>

              <div className="flex items-end gap-1">
                <div className="flex-1">
                  <label className="text-[10px] text-slate-500 font-semibold block mb-0.5">Ref / Tr. ID</label>
                  <Input
                    placeholder={REFERENCE_HINT[p.paymentMode] || "Reference"}
                    value={p.transactionId}
                    onChange={(e) => update(idx, { transactionId: e.target.value, referenceNo: e.target.value })}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                {payments.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onChange(payments.filter((_, i) => i !== idx))}
                    className="h-8 w-8 text-red-500 hover:text-red-700"
                    title="Remove payment row"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600">{error}</div>
      )}

      <div className="flex justify-end pt-1">
        <Button variant="ghost" size="sm" onClick={fillBalance} className="text-xs text-blue-600 hover:text-blue-700 font-semibold h-6">
          Collect balance in first row (₹{formatMoney(netPayable)})
        </Button>
      </div>
    </div>
  );
}
