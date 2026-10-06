import { useMemo, useState } from "react";
import { BarChart3, BookOpen, ChevronRight, Loader2, Package, Receipt, Search, ShoppingBag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useReportCatalogue } from "./use-report-catalogue";

const GROUPS = [
  { name: "Sales", icon: BarChart3, tone: "text-blue-700 bg-blue-50 ring-blue-100" },
  { name: "Purchase", icon: ShoppingBag, tone: "text-violet-700 bg-violet-50 ring-violet-100" },
  { name: "Stock", icon: Package, tone: "text-amber-700 bg-amber-50 ring-amber-100" },
  { name: "Accounts", icon: BookOpen, tone: "text-emerald-700 bg-emerald-50 ring-emerald-100" },
  { name: "GST", icon: Receipt, tone: "text-rose-700 bg-rose-50 ring-rose-100" },
];

/** Catalogue of every report, grouped. `onOpen(key)` opens one. */
export default function ReportsHub({ onOpen }) {
  const { catalogue, loading, error } = useReportCatalogue();
  const [q, setQ] = useState("");

  const grouped = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s ? catalogue.filter((r) => `${r.name} ${r.description} ${r.group}`.toLowerCase().includes(s)) : catalogue;
    return GROUPS.map((g) => ({ ...g, reports: list.filter((r) => r.group === g.name) })).filter((g) => g.reports.length);
  }, [catalogue, q]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border bg-white p-6 text-sm text-slate-500">
        <Loader2 className="size-4 animate-spin" /> Loading reports…
      </div>
    );
  }
  if (error) return <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl bg-linear-to-r from-slate-950 via-blue-950 to-blue-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-amber-200">Reports</p>
          <h2 className="mt-0.5 text-lg font-semibold">{catalogue.length} reports · every one downloads as PDF and Excel</h2>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <Input className="h-9 border-white/20 bg-white pl-8 text-sm text-slate-900" placeholder="Find a report…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {grouped.map((g) => (
        <section key={g.name}>
          <div className="mb-2 flex items-center gap-2">
            <span className={`flex size-7 items-center justify-center rounded-lg ring-1 ${g.tone}`}>
              <g.icon size={15} />
            </span>
            <h3 className="text-sm font-semibold text-slate-800">{g.name}</h3>
            <span className="text-xs text-slate-400">{g.reports.length}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {g.reports.map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => onOpen(r.key)}
                className="group flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:border-blue-300 hover:shadow-sm"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 group-hover:text-blue-800">{r.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">{r.description}</p>
                  <p className="mt-2 text-[11px] font-medium text-slate-400">{r.period === "none" ? "As on today" : `Default: ${String(r.defaultPeriod || "").replace(/_/g, " ").toLowerCase()}`}</p>
                </div>
                <ChevronRight className="mt-0.5 size-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
              </button>
            ))}
          </div>
        </section>
      ))}
      {!grouped.length && <p className="text-sm text-slate-500">No report matches “{q}”.</p>}
    </div>
  );
}
