import { useEffect, useState } from "react";
import { Loader2, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { deleteStockEntry, getStockEntries } from "@/api/stock-entry-api";
import { notifyError, notifySuccess } from "@/utils/notify";
import { money, weightStr } from "@/utils/units";
import ConfirmDialog from "../shared/confirm-dialog";

const PAGE_SIZE = 20;
const MODE_LABEL = { OPENING: "Opening", PURCHASE: "Supplier" };
const MODE_TONE = {
  OPENING: "bg-slate-100 text-slate-700 border-slate-200",
  PURCHASE: "bg-blue-50 text-blue-700 border-blue-200",
};

/** GET /api/stock/entries with delete for entries whose pieces are untouched. `refreshKey` reloads. */
export default function RecentEntries({ refreshKey }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [reload, setReload] = useState(0);
  const [toDelete, setToDelete] = useState(null);

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
        const res = await getStockEntries({ page, limit: PAGE_SIZE, search: debounced });
        if (!alive) return;
        setRows(res.entries);
        setPagination(res.pagination);
      } catch (error) {
        if (alive) notifyError(error, "Failed to load stock entries.");
      } finally {
        if (alive) setLoading(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [page, debounced, refreshKey, reload]);

  const confirmDelete = async () => {
    try {
      await deleteStockEntry(toDelete.id);
      notifySuccess(`Entry ${toDelete.invoiceNo || `#${toDelete.id}`} deleted.`);
      setReload((n) => n + 1);
    } catch (error) {
      notifyError(error, "Could not delete the entry.");
      throw error;
    }
  };

  const totalPages = pagination.totalPages || 1;

  return (
    <section className="space-y-3" aria-labelledby="recent-entries-title">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="recent-entries-title" className="text-base font-semibold">
          Recent entries
        </h2>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Search stock entries"
            placeholder="Search entry no. or supplier…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 text-xs"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-600">
            <tr>
              <th className="p-3 text-left">Entry no.</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Mode</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-right">Pieces</th>
              <th className="p-3 text-right">Gross g</th>
              <th className="p-3 text-right">Net g</th>
              <th className="p-3 text-right">Value ₹</th>
              <th className="p-3 text-center">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && !rows.length ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-400">
                  <Loader2 className="mr-1 inline h-4 w-4 animate-spin" /> Loading entries…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center text-slate-400">
                  No stock entries yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs">{row.invoiceNo || `#${row.id}`}</td>
                  <td className="p-3 text-xs">{row.date ? new Date(row.date).toLocaleDateString("en-IN") : "-"}</td>
                  <td className="p-3">
                    <span className={`inline-block rounded border px-2 py-0.5 text-[11px] font-semibold ${MODE_TONE[row.mode] || MODE_TONE.OPENING}`}>
                      {MODE_LABEL[row.mode] || row.mode}
                    </span>
                  </td>
                  <td className="p-3 text-xs">{row.partyName || "-"}</td>
                  <td className="p-3 text-right text-xs tabular-nums">{row.pieces ?? 0}</td>
                  <td className="p-3 text-right text-xs tabular-nums">{weightStr(row.grossWeight)}</td>
                  <td className="p-3 text-right text-xs tabular-nums">{weightStr(row.netWeight)}</td>
                  <td className="p-3 text-right text-xs tabular-nums">{row.mode === "PURCHASE" ? money(row.netPayable) : "-"}</td>
                  <td className="p-3 text-center">
                    {row.deletable ? (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-red-600 hover:text-red-700"
                        title="Delete entry"
                        aria-label={`Delete entry ${row.invoiceNo || row.id}`}
                        onClick={() => setToDelete(row)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <span className="text-slate-600">
          {pagination.total || 0} entr{pagination.total === 1 ? "y" : "ies"}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => p - 1)}>
            Previous
          </Button>
          <span>
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => p + 1)}>
            Next
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        setOpen={(value) => !value && setToDelete(null)}
        title="Delete this stock entry?"
        description={
          toDelete
            ? `${toDelete.invoiceNo || `Entry #${toDelete.id}`} and its ${toDelete.pieces ?? ""} piece(s) will be removed from stock. This cannot be undone.`
            : ""
        }
        confirmLabel="Delete entry"
        destructive
        onConfirm={confirmDelete}
      />
    </section>
  );
}
