import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** From / To date filter for voucher lists. */
export function DateRangeFilter({ startDate, endDate, onStartDate, onEndDate }) {
  return (
    <div className="flex items-center gap-2">
      <Input
        type="date"
        value={startDate}
        max={endDate || undefined}
        onChange={(e) => onStartDate(e.target.value)}
        className="text-xs"
        aria-label="From date"
      />
      <span className="text-xs text-slate-400">to</span>
      <Input
        type="date"
        value={endDate}
        min={startDate || undefined}
        onChange={(e) => onEndDate(e.target.value)}
        className="text-xs"
        aria-label="To date"
      />
      {startDate || endDate ? (
        <button
          type="button"
          className="text-[11px] text-slate-500 underline"
          onClick={() => {
            onStartDate("");
            onEndDate("");
          }}
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

/** Previous / next pager driven by the server's pagination block. */
export function VoucherPager({ pagination, shown, loading, onPage, noun = "voucher(s)" }) {
  const page = pagination?.page || 1;
  const totalPages = pagination?.totalPages || 1;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-slate-600">
      <span>
        Showing <strong>{shown}</strong> of <strong>{pagination?.total ?? shown}</strong> {noun}
      </span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>
          Previous
        </Button>
        <span>
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={loading || page >= totalPages} onClick={() => onPage(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}
