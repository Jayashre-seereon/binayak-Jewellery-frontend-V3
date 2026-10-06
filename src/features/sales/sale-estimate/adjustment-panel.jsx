import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TONES = {
  emerald: {
    card: "border-emerald-200",
    head: "text-emerald-700",
    selected: "bg-emerald-50 border-emerald-400",
    amount: "text-emerald-800",
    accent: "text-emerald-600 focus:ring-emerald-500",
    divider: "border-emerald-200",
    btn: "text-emerald-700 hover:bg-emerald-100",
  },
  amber: {
    card: "border-amber-200",
    head: "text-amber-700",
    selected: "bg-amber-50 border-amber-400",
    amount: "text-amber-800",
    accent: "text-amber-600 focus:ring-amber-500",
    divider: "border-amber-200",
    btn: "text-amber-700 hover:bg-amber-100",
  },
};

/**
 * One list of adjustable documents (advance receipts or old-gold purchases).
 * `maxFor(row)` is the most this row may take now (its balance, capped by what is left of the invoice).
 */
export default function AdjustmentPanel({
  title,
  icon,
  tone = "emerald",
  rows,
  selection,
  onToggle,
  onAmount,
  maxFor,
  docNo,
  docTotal,
  subLine,
  formatMoney,
  emptyText,
}) {
  const Icon = icon;
  const t = TONES[tone];
  const available = rows.reduce((s, r) => s + Number(r.balanceAmount || 0), 0);

  return (
    <div className={`bg-white rounded-lg border p-3 shadow-xs space-y-2 ${t.card}`}>
      <div className="flex items-center justify-between pb-1 border-b border-slate-100">
        <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
          <Icon className={`h-3.5 w-3.5 ${t.head}`} />
          <span>
            {title} ({rows.length})
          </span>
        </div>
        <span className={`text-[11px] font-semibold ${t.head}`}>Available: ₹{formatMoney(available)}</span>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-2 text-center italic">{emptyText}</p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
          {rows.map((row) => {
            const sel = selection[row.id] || { isSelected: false, adjustedAmount: "" };
            const max = maxFor(row);
            const over = sel.isSelected && Number(sel.adjustedAmount || 0) > Number(row.balanceAmount || 0) + 0.01;
            return (
              <div
                key={row.id}
                className={`p-2.5 rounded border transition flex flex-col gap-1.5 ${
                  sel.isSelected ? `${t.selected} shadow-xs` : "bg-slate-50 border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-center justify-between text-xs gap-2">
                  <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-900 min-w-0">
                    <input
                      type="checkbox"
                      checked={Boolean(sel.isSelected)}
                      onChange={(e) => onToggle(row, e.target.checked)}
                      className={`rounded h-4 w-4 ${t.accent}`}
                    />
                    <span className="truncate">{docNo(row)}</span>
                    <span className="text-[10px] text-slate-400 font-normal shrink-0">
                      ({row.date ? new Date(row.date).toLocaleDateString("en-IN") : "-"})
                    </span>
                  </label>
                  <div className="text-right shrink-0">
                    <span className="text-slate-500 text-[10px]">Bal: </span>
                    <span className={`font-bold ${t.head}`}>₹{formatMoney(row.balanceAmount)}</span>
                    <span className="text-slate-400 text-[10px]"> / ₹{formatMoney(docTotal(row))}</span>
                  </div>
                </div>

                {subLine && <div className="text-[11px] text-slate-600 truncate pl-6">{subLine(row)}</div>}

                {sel.isSelected && (
                  <div className={`flex flex-wrap items-center gap-2 pt-1 border-t text-xs ${t.divider}`}>
                    <span className="text-slate-600 text-[11px] font-medium">Adjust (₹):</span>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max={max}
                      value={sel.adjustedAmount}
                      onChange={(e) => onAmount(row, e.target.value)}
                      className={`h-7 w-28 text-xs font-bold ${t.amount} ${over ? "border-red-500" : ""}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onAmount(row, max)}
                      className={`h-6 text-[10px] px-2 ${t.btn}`}
                      title="Use as much as the invoice still needs"
                    >
                      Max ₹{formatMoney(max)}
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
