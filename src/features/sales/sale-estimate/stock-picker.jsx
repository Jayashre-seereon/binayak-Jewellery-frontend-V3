import { useEffect, useRef, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { searchInventories } from "@/api/barcode-api";
import { formatWeight } from "@/utils/units";

/**
 * Server-side search over AVAILABLE pieces (barcode / tag / HUID / item / product), debounced 300 ms.
 * Replaces the old dropdown that loaded the entire stock.
 */
export default function StockPicker({ onPick, excludeIds = [], disabled }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [total, setTotal] = useState(0);
  const boxRef = useRef(null);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return undefined;
    let alive = true;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const { inventories, pagination } = await searchInventories({ status: "AVAILABLE", search: term, page: 1, limit: 20 });
        if (!alive) return;
        setResults(inventories);
        setTotal(pagination?.total ?? inventories.length);
        setOpen(true);
      } catch {
        if (alive) setResults([]);
      } finally {
        if (alive) setLoading(false);
      }
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const visible = query.trim().length >= 2 ? results : [];
  const excluded = new Set(excludeIds.map(Number));

  return (
    <div className="relative w-full" ref={boxRef} data-scanner-ignore>
      <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
      <Input
        disabled={disabled}
        placeholder="Search available stock (item, HUID, tag)…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => visible.length && setOpen(true)}
        className="h-10 pl-9 text-xs border-blue-300 bg-white"
      />
      {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-blue-500" />}
      {open && query.trim().length >= 2 && (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {visible.length === 0 && !loading ? (
            <div className="p-3 text-center text-xs text-slate-400">No available pieces match "{query.trim()}".</div>
          ) : (
            visible.map((inv) => {
              const already = excluded.has(Number(inv.id));
              return (
                <button
                  key={inv.id}
                  type="button"
                  disabled={already}
                  onClick={() => {
                    onPick(inv);
                    setOpen(false);
                    setQuery("");
                  }}
                  className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-xs last:border-0 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-slate-800">
                      {inv.item?.name || inv.product?.name || inv.inventoryCode}
                    </span>
                    <span className="block truncate font-mono text-[10px] text-slate-500">
                      {[inv.barcodeNo, inv.tagNo, inv.huidNo && `HUID ${inv.huidNo}`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[11px] text-slate-600">
                    {inv.purityMaster?.name && <span className="mr-1 font-semibold text-amber-700">{inv.purityMaster.name}</span>}
                    {formatWeight(inv.netWeight || inv.grossWeight)}
                    {already && <span className="block text-[10px] text-blue-600">In bill</span>}
                  </span>
                </button>
              );
            })
          )}
          {total > visible.length && (
            <div className="bg-slate-50 px-3 py-1.5 text-[10px] text-slate-500">
              Showing {visible.length} of {total}. Refine the search to narrow down.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
