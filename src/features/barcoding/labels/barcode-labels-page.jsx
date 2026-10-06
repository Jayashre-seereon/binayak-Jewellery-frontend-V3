import { useEffect, useMemo, useState } from "react";
import { Loader2, Printer, Search, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import { getMetals } from "@/api/metal-api";
import { getInventoryLabelPdf, getInventoryLabelsBulkPdf, searchInventories } from "@/api/barcode-api";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import BarcodeImage from "@/lib/barcode/barcode-image";
import { openBlob, playBeep, playErrorBeep } from "@/lib/barcode/feedback";
import { formatWeight } from "@/utils/units";

const PAGE_SIZE = 25;
const MAX_BULK = 200;
const selectCls = "h-9 rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

/**
 * Print tag labels for real inventory pieces (replaces the old in-memory barcoding mocks, INV-14).
 * `preset` pre-filters for the legacy menu entries (gold / diamond / MRP / branded).
 */
export default function BarcodeLabelsPage({ preset = {} }) {
  const [metals, setMetals] = useState([]);
  const [metalId, setMetalId] = useState("");
  const [purchaseType, setPurchaseType] = useState(preset.purchaseType || "");
  const [status, setStatus] = useState("AVAILABLE");
  const [search, setSearch] = useState(preset.search || "");
  const [debounced, setDebounced] = useState(preset.search || "");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(() => new Map()); // id -> inventory
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    let alive = true;
    getMetals()
      .then((list) => {
        if (!alive) return;
        setMetals(list);
        if (preset.metalPattern) {
          const match = list.find((m) => preset.metalPattern.test(m.name || ""));
          if (match) setMetalId(String(match.id));
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [preset.metalPattern]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await searchInventories({
          status,
          search: debounced,
          page,
          limit: PAGE_SIZE,
          metalId: metalId || undefined,
          purchaseType: purchaseType || undefined,
        });
        if (!alive) return;
        setRows(res.inventories);
        setPagination(res.pagination || { total: res.inventories.length, totalPages: 1 });
      } catch (error) {
        if (alive) notifyError(error, "Failed to load inventory.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [status, debounced, page, metalId, purchaseType]);

  const toggle = (inv, checked) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (checked) next.set(inv.id, inv);
      else next.delete(inv.id);
      return next;
    });

  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = (checked) =>
    setSelected((prev) => {
      const next = new Map(prev);
      rows.forEach((r) => (checked ? next.set(r.id, r) : next.delete(r.id)));
      return next;
    });

  // Scanning a tag adds that piece to the print selection.
  useBarcodeScanner({
    onScan: async ({ code }) => {
      try {
        const res = await searchInventories({ status: "", search: code, page: 1, limit: 5 });
        const exact = res.inventories.find((inv) =>
          [inv.barcodeNo, inv.tagNo, inv.huidNo, inv.inventoryCode].some((c) => c && String(c).toUpperCase() === code.toUpperCase())
        );
        if (!exact) {
          playErrorBeep();
          notifyError(null, `No piece found for barcode ${code}.`);
          return;
        }
        playBeep();
        toggle(exact, true);
        notifyInfo(`${exact.item?.name || exact.inventoryCode} added to the print list.`);
      } catch (error) {
        notifyError(error, "Lookup failed.");
      }
    },
  });

  const printOne = async (inv) => {
    try {
      setPrinting(inv.id);
      const pdf = await getInventoryLabelPdf(inv.id);
      openBlob(pdf, `label-${inv.barcodeNo || inv.inventoryCode}.pdf`);
    } catch (error) {
      notifyError(error, "Could not print the label.");
    } finally {
      setPrinting(null);
    }
  };

  const printSelected = async () => {
    const ids = [...selected.keys()];
    if (!ids.length) return;
    if (ids.length > MAX_BULK) {
      notifyError(null, `Print at most ${MAX_BULK} labels at a time (selected ${ids.length}).`);
      return;
    }
    try {
      setPrinting("bulk");
      const pdf = await getInventoryLabelsBulkPdf(ids);
      openBlob(pdf, `labels-${ids.length}.pdf`);
      notifySuccess(`${ids.length} label${ids.length > 1 ? "s" : ""} sent to PDF.`);
    } catch (error) {
      notifyError(error, "Could not print labels.");
    } finally {
      setPrinting(null);
    }
  };

  const selectedList = useMemo(() => [...selected.values()], [selected]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">{preset.title || "Barcode Labels"}</h1>
          <p className="text-xs text-slate-500">
            {preset.description || "Find tagged pieces, select them (or scan their tags) and print labels."}
          </p>
        </div>
        <Button onClick={printSelected} disabled={!selected.size || printing === "bulk"} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
          {printing === "bulk" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
          Print selected ({selected.size})
        </Button>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 shadow-sm md:flex-row md:items-center">
        <div className="relative flex-1" data-scanner-ignore>
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search barcode, tag, HUID, item, product, purchase invoice…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-xs"
          />
        </div>
        <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="DAMAGED">Damaged</option>
          <option value="">All statuses</option>
        </select>
        <select className={selectCls} value={metalId} onChange={(e) => { setMetalId(e.target.value); setPage(1); }}>
          <option value="">All metals</option>
          {metals.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select className={selectCls} value={purchaseType} onChange={(e) => { setPurchaseType(e.target.value); setPage(1); }}>
          <option value="">All stock types</option>
          <option value="ORNAMENT">Ornament</option>
          <option value="BULLION">Bullion</option>
          <option value="OLD">Old / URD</option>
        </select>
      </div>

      {selectedList.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 p-2 text-xs">
          <Tags className="h-3.5 w-3.5 text-blue-700" />
          {selectedList.slice(0, 12).map((inv) => (
            <span key={inv.id} className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-white px-2 py-0.5 font-mono">
              {inv.barcodeNo || inv.tagNo || inv.inventoryCode}
              <button type="button" onClick={() => toggle(inv, false)} className="text-slate-400 hover:text-red-600" aria-label="Remove">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {selectedList.length > 12 && <span className="text-blue-800">+{selectedList.length - 12} more</span>}
          <button type="button" onClick={() => setSelected(new Map())} className="ml-auto font-semibold text-blue-700 hover:underline">
            Clear
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="w-10 p-3">
                <input type="checkbox" checked={allOnPageSelected} onChange={(e) => togglePage(e.target.checked)} aria-label="Select page" />
              </th>
              <th className="p-3 text-left">Barcode</th>
              <th className="p-3 text-left">Item</th>
              <th className="p-3 text-left">Tag / HUID</th>
              <th className="p-3 text-left">Purity</th>
              <th className="p-3 text-right">Gross</th>
              <th className="p-3 text-right">Net</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3 text-center">Label</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !rows.length ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  Loading pieces…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-slate-400">
                  No pieces match these filters.
                </td>
              </tr>
            ) : (
              rows.map((inv) => (
                <tr key={inv.id} className={selected.has(inv.id) ? "bg-blue-50/50" : "hover:bg-slate-50"}>
                  <td className="p-3 text-center">
                    <input type="checkbox" checked={selected.has(inv.id)} onChange={(e) => toggle(inv, e.target.checked)} aria-label="Select piece" />
                  </td>
                  <td className="p-3">
                    {inv.barcodeNo ? (
                      <div className="space-y-0.5">
                        <BarcodeImage code={inv.barcodeNo} symbology="CODE128" height={7} scale={1} includeText={0} className="h-7" />
                        <div className="font-mono text-[11px] text-slate-600">{inv.barcodeNo}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-amber-700">No barcode</span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{inv.item?.name || inv.product?.name || "-"}</div>
                    <div className="text-[11px] text-slate-500">{inv.inventoryCode}</div>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    <div>{inv.tagNo || "-"}</div>
                    {inv.huidNo && <div className="text-slate-500">HUID {inv.huidNo}</div>}
                  </td>
                  <td className="p-3 text-xs font-semibold text-amber-700">{inv.purityMaster?.name || "-"}</td>
                  <td className="p-3 text-right text-xs">{formatWeight(inv.grossWeight)}</td>
                  <td className="p-3 text-right text-xs">{formatWeight(inv.netWeight)}</td>
                  <td className="p-3 text-center text-[11px] font-semibold">{inv.status}</td>
                  <td className="p-3 text-center">
                    <Button variant="ghost" size="icon" title="Print label" onClick={() => printOne(inv)} disabled={printing === inv.id} className="h-8 w-8">
                      {printing === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span>
          {pagination.total || 0} piece{pagination.total === 1 ? "" : "s"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {pagination.totalPages || 1}
          </span>
          <Button variant="outline" disabled={page >= (pagination.totalPages || 1) || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
