import { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { Select } from "antd";
import { ClipboardPaste, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getItemOptions } from "@/api/item-api";
import { getPurities } from "@/api/purity-api";
import { getParties } from "@/api/party-api";
import { resolveStoreState } from "@/api/store-api";
import { getBarcodeConfig } from "@/api/barcode-api";
import { checkStockBarcode, createStockEntry } from "@/api/stock-entry-api";
import { getActiveStoreId, useAuthStore } from "@/store/authStore";
import { DEFAULT_BARCODE_CONFIG, cleanScannedCode } from "@/lib/barcode/config";
import { validateBarcodeText } from "@/lib/barcode/validate";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/utils/notify";
import { money, weightStr } from "@/utils/units";
import { DEFAULT_STORE_STATE } from "@/features/purchase/old/purchase-calc";
import StockEntryGrid from "./stock-entry-grid";
import PasteRowsDialog from "./paste-rows-dialog";
import StockEntryResult from "./stock-entry-result";
import RecentEntries from "./recent-entries";
import {
  MODES,
  PAYMENT_MODES,
  buildPayload,
  createPayment,
  createRow,
  duplicateBarcodeKeys,
  duplicateRow,
  hasErrors,
  isBlankRow,
  itemDefaultPurityId,
  normalizeCode,
  rowNumberFromError,
  totalsOf,
  validateEntry,
  decimalInput,
} from "./stock-entry-model";

const today = () => dayjs().format("YYYY-MM-DD");
const fieldCls =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const toList = (value) => {
  if (Array.isArray(value)) return value;
  for (const key of ["data", "parties", "items"]) if (Array.isArray(value?.[key])) return value[key];
  return [];
};

const emptyHeader = (storeState) => ({
  date: today(),
  partyId: "",
  referenceNo: "",
  applyGst: true,
  placeOfSupply: storeState || "",
  narration: "",
});

const EMPTY_VALIDATION = { header: {}, rows: {}, general: [] };

export default function StockEntryPage() {
  const selectedStore = useAuthStore((state) => state.selectedStore);
  const [mode, setMode] = useState(MODES.OPENING);
  const [storeState, setStoreState] = useState(selectedStore?.state || null);
  const [header, setHeader] = useState(() => emptyHeader(selectedStore?.state));
  const [rows, setRows] = useState(() => [createRow()]);
  const [payments, setPayments] = useState([]);
  const [masters, setMasters] = useState({ items: [], purities: [], parties: [] });
  const [loading, setLoading] = useState(true);
  const [scanConfig, setScanConfig] = useState(DEFAULT_BARCODE_CONFIG);
  const [barcodeChecks, setBarcodeChecks] = useState({}); // rowKey -> { code, state, usedBy }
  const [validation, setValidation] = useState(EMPTY_VALIDATION);
  const [serverError, setServerError] = useState(null); // { key, message } | { message }
  const [saving, setSaving] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const checkSeq = useRef(0);

  useEffect(() => {
    let alive = true;
    const warn = (label) => (error) => {
      notifyError(error, `Failed to load ${label}.`);
      return [];
    };
    Promise.all([
      getItemOptions().catch(warn("items")),
      getPurities().catch(warn("purities")),
      getParties().catch(warn("suppliers")),
      resolveStoreState(getActiveStoreId(), selectedStore),
      getBarcodeConfig().catch(() => DEFAULT_BARCODE_CONFIG),
    ]).then(([items, purities, parties, state, config]) => {
      if (!alive) return;
      setMasters({ items: toList(items), purities: toList(purities), parties: toList(parties) });
      setScanConfig(config);
      if (state) {
        setStoreState(state);
        setHeader((h) => (h.placeOfSupply ? h : { ...h, placeOfSupply: state }));
      }
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [selectedStore]);

  const itemsById = useMemo(() => new Map(masters.items.map((o) => [String(o.id), o])), [masters.items]);
  const purityName = useMemo(() => new Map(masters.purities.map((p) => [String(p.id), p.name])), [masters.purities]);

  const itemSelectOptions = useMemo(
    () =>
      masters.items.map((o) => {
        const purity = purityName.get(itemDefaultPurityId(o)) || o.product?.purity?.name || "";
        const parts = [o.name, o.product?.name, purity].filter(Boolean).join(" · ");
        return { value: String(o.id), label: o.barcode ? `${parts} [${o.barcode}]` : parts };
      }),
    [masters.items, purityName]
  );

  const duplicateKeys = useMemo(() => duplicateBarcodeKeys(rows), [rows]);
  const totals = useMemo(() => totalsOf(rows), [rows]);
  const purchase = mode === MODES.PURCHASE;

  const rowErrors = useMemo(() => {
    if (!serverError?.key) return validation.rows;
    return { ...validation.rows, [serverError.key]: [...(validation.rows[serverError.key] || []), serverError.message] };
  }, [validation.rows, serverError]);

  const clearRowFeedback = (key) => {
    if (validation.rows[key]) {
      setValidation((v) => {
        const nextRows = { ...v.rows };
        delete nextRows[key];
        return { ...v, rows: nextRows };
      });
    }
    if (serverError?.key === key) setServerError(null);
  };

  const updateHeader = (field, value) => {
    setHeader((h) => ({ ...h, [field]: value }));
    if (validation.header[field]) setValidation((v) => ({ ...v, header: { ...v.header, [field]: undefined } }));
  };

  const changeParty = (partyId) => {
    const party = masters.parties.find((p) => String(p.id) === String(partyId));
    setHeader((h) => ({ ...h, partyId: partyId || "", placeOfSupply: party?.state || h.placeOfSupply }));
    if (validation.header.partyId) setValidation((v) => ({ ...v, header: { ...v.header, partyId: undefined } }));
  };

  const changeRow = (key, field, value) => {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
    clearRowFeedback(key);
  };

  const changeItem = (key, itemId) => {
    const option = itemsById.get(itemId);
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, itemId, unmatchedName: itemId ? "" : r.unmatchedName, purityId: itemDefaultPurityId(option) } : r
      )
    );
    clearRowFeedback(key);
  };

  const addRow = () => setRows((prev) => [...prev, createRow()]);
  const copyRow = (key) =>
    setRows((prev) => {
      const index = prev.findIndex((r) => r.key === key);
      if (index < 0) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, duplicateRow(prev[index]));
      return next;
    });
  const deleteRow = (key) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : [createRow()]));
    clearRowFeedback(key);
  };

  const appendPasted = (pasted) => {
    setRows((prev) => [...prev.filter((r) => !isBlankRow(r)), ...pasted]);
    pasted.filter((r) => r.barcode.trim()).forEach((r) => runBarcodeCheck(r.key, r.barcode));
  };

  async function runBarcodeCheck(key, rawCode) {
    const code = normalizeCode(rawCode);
    if (!code || validateBarcodeText(rawCode)) {
      setBarcodeChecks((prev) => ({ ...prev, [key]: undefined }));
      return;
    }
    const ticket = ++checkSeq.current;
    setBarcodeChecks((prev) => ({ ...prev, [key]: { code, state: "checking", ticket } }));
    let next;
    try {
      const res = await checkStockBarcode(rawCode.trim());
      next = { code, state: res.available ? "ok" : "taken", usedBy: res.usedBy || null, ticket };
    } catch {
      next = { code, state: "error", ticket };
    }
    // a later check for the same row wins
    setBarcodeChecks((prev) => (prev[key]?.ticket === ticket ? { ...prev, [key]: next } : prev));
  }

  const onBarcodeBlur = (key) => {
    const row = rows.find((r) => r.key === key);
    if (!row) return;
    const cleaned = cleanScannedCode(row.barcode, scanConfig);
    if (cleaned !== row.barcode) changeRow(key, "barcode", cleaned);
    const current = barcodeChecks[key];
    if (current?.code === normalizeCode(cleaned) && current.state !== "error") return;
    runBarcodeCheck(key, cleaned);
  };

  const switchMode = (next) => {
    setMode(next);
    setValidation(EMPTY_VALIDATION);
    setServerError(null);
  };

  const resetForm = () => {
    setRows([createRow()]);
    setPayments([]);
    setHeader(emptyHeader(storeState));
    setBarcodeChecks({});
    setValidation(EMPTY_VALIDATION);
    setServerError(null);
    setResult(null);
  };

  const save = async () => {
    const v = validateEntry({ mode, header, rows, payments, barcodeChecks });
    setValidation(v);
    setServerError(null);
    if (hasErrors(v)) {
      notifyError(null, "Fix the highlighted fields before saving.");
      return;
    }
    const { body, keys } = buildPayload({ mode, header, rows, payments });
    try {
      setSaving(true);
      const created = await createStockEntry(body);
      const pieces = created?.pieces || [];
      notifySuccess(`${pieces.length} piece${pieces.length === 1 ? "" : "s"} added to stock.`);
      setResult({ purchase: created?.purchase || null, pieces });
      setRefreshKey((n) => n + 1);
    } catch (error) {
      const message = getApiErrorMessage(error, "Stock entry could not be saved.");
      const rowNo = rowNumberFromError(message);
      setServerError(rowNo && keys[rowNo - 1] ? { key: keys[rowNo - 1], message } : { message });
      notifyError(error, "Stock entry could not be saved.");
    } finally {
      setSaving(false);
    }
  };

  const headerError = (field) =>
    validation.header[field] ? <p className="mt-0.5 text-[11px] text-red-600">{validation.header[field]}</p> : null;

  const effectiveState = storeState || DEFAULT_STORE_STATE;
  const generalErrors = [...validation.general, ...(serverError && !serverError.key ? [serverError.message] : [])];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Stock Entry</h1>
          <p className="text-xs text-slate-500">
            One row per tagged piece. Leave Barcode blank to generate one, or scan the tag the piece already carries.
          </p>
        </div>
      </div>

      {result ? (
        <StockEntryResult result={result} onNewEntry={resetForm} />
      ) : (
        <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm" aria-label="New stock entry">
          <div className="flex flex-wrap items-end gap-3">
            <div role="radiogroup" aria-label="Entry type" className="inline-flex rounded-lg border border-slate-300 bg-slate-50 p-0.5">
              {[
                { value: MODES.OPENING, label: "Opening / own stock" },
                { value: MODES.PURCHASE, label: "Supplier purchase" },
              ].map((m) => (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.value}
                  onClick={() => switchMode(m.value)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    mode === m.value ? "bg-blue-600 text-white shadow-sm" : "text-slate-700 hover:bg-white"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <div className="w-40">
              <label htmlFor="se-date" className="text-xs text-slate-600">
                Date *
              </label>
              <input
                id="se-date"
                type="date"
                className={`${fieldCls} ${validation.header.date ? "border-red-500" : ""}`}
                value={header.date}
                onChange={(e) => updateHeader("date", e.target.value)}
              />
              {headerError("date")}
            </div>
            <div className="min-w-[200px] flex-1">
              <label htmlFor="se-note" className="text-xs text-slate-600">
                Note
              </label>
              <Input
                id="se-note"
                className="h-9"
                placeholder="Optional"
                value={header.narration}
                onChange={(e) => updateHeader("narration", e.target.value)}
              />
            </div>
          </div>

          {purchase && (
            <div className="grid grid-cols-1 gap-3 rounded-md border border-blue-100 bg-blue-50/40 p-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label htmlFor="se-party" className="text-xs text-slate-600">
                  Supplier *
                </label>
                <Select
                  id="se-party"
                  showSearch={{ optionFilterProp: "label" }}
                  allowClear
                  className="w-full"
                  style={{ height: 36 }}
                  status={validation.header.partyId ? "error" : undefined}
                  placeholder={loading ? "Loading…" : "Search party"}
                  loading={loading}
                  value={header.partyId || undefined}
                  options={masters.parties.map((p) => ({ value: String(p.id), label: p.phone ? `${p.name} (${p.phone})` : p.name }))}
                  onChange={(value) => changeParty(value ? String(value) : "")}
                  notFoundContent="No matching party"
                />
                {headerError("partyId")}
              </div>
              <div>
                <label htmlFor="se-ref" className="text-xs text-slate-600">
                  Supplier bill no.
                </label>
                <Input id="se-ref" className="h-9" value={header.referenceNo} onChange={(e) => updateHeader("referenceNo", e.target.value)} />
              </div>
              <div>
                <label htmlFor="se-pos" className="text-xs text-slate-600">
                  Place of supply
                </label>
                <Input
                  id="se-pos"
                  className="h-9"
                  placeholder={`Store state (${effectiveState})`}
                  value={header.placeOfSupply}
                  onChange={(e) => updateHeader("placeOfSupply", e.target.value)}
                />
              </div>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" className="h-4 w-4" checked={header.applyGst} onChange={(e) => updateHeader("applyGst", e.target.checked)} />
                Charge GST (3%)
              </label>

              <div className="md:col-span-2 xl:col-span-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">Payment made</span>
                  {payments.map((p, i) => (
                    <div key={p.key} className="flex items-center gap-1 rounded-md border border-slate-200 bg-white p-1">
                      <select
                        aria-label={`Payment ${i + 1} mode`}
                        className="h-7 rounded border border-slate-300 bg-white px-1 text-xs"
                        value={p.paymentMode}
                        onChange={(e) => setPayments((prev) => prev.map((x) => (x.key === p.key ? { ...x, paymentMode: e.target.value } : x)))}
                      >
                        {PAYMENT_MODES.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={`Payment ${i + 1} amount`}
                        inputMode="decimal"
                        placeholder="Amount ₹"
                        className="h-7 w-28 rounded border border-slate-300 px-2 text-right text-xs"
                        value={p.amount}
                        onChange={(e) =>
                          setPayments((prev) => prev.map((x) => (x.key === p.key ? { ...x, amount: decimalInput(e.target.value) } : x)))
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Remove payment ${i + 1}`}
                        onClick={() => setPayments((prev) => prev.filter((x) => x.key !== p.key))}
                      >
                        <Trash2 className="text-red-600" />
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setPayments((prev) => [...prev, createPayment()])}>
                    <Plus className="h-3.5 w-3.5" /> Add payment
                  </Button>
                  {!payments.length && <span className="text-[11px] text-slate-500">None — the full amount stays payable to the supplier.</span>}
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-800">Pieces</h2>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="stock-entry-bulk-purity" className="text-xs text-slate-600">
                Purity for rows without one
              </label>
              <select
                id="stock-entry-bulk-purity"
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
                value=""
                disabled={loading || !masters.purities.length}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value) setRows((prev) => prev.map((r) => (r.purityId || isBlankRow(r) ? r : { ...r, purityId: value })));
                }}
              >
                <option value="">Apply…</option>
                {masters.purities.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setPasteOpen(true)} disabled={loading}>
                <ClipboardPaste className="h-3.5 w-3.5" /> Paste from Excel
              </Button>
            </div>
          </div>

          {generalErrors.length > 0 && (
            <div role="alert" className="space-y-0.5 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {generalErrors.map((msg) => (
                <div key={msg}>{msg}</div>
              ))}
            </div>
          )}

          <StockEntryGrid
            mode={mode}
            rows={rows}
            itemSelectOptions={itemSelectOptions}
            purities={masters.purities}
            loading={loading}
            rowErrors={rowErrors}
            duplicateKeys={duplicateKeys}
            barcodeChecks={barcodeChecks}
            onChangeRow={changeRow}
            onItemChange={changeItem}
            onBarcodeBlur={onBarcodeBlur}
            onAddRow={addRow}
            onDuplicateRow={copyRow}
            onDeleteRow={deleteRow}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-1.5">
                <dt className="text-slate-500">Tags</dt>
                <dd className="font-semibold tabular-nums">{totals.tags}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-slate-500">Pieces</dt>
                <dd className="font-semibold tabular-nums">{totals.pieces}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-slate-500">Gross</dt>
                <dd className="font-semibold tabular-nums">{weightStr(totals.gross)} g</dd>
              </div>
              <div className="flex gap-1.5">
                <dt className="text-slate-500">Net</dt>
                <dd className="font-semibold tabular-nums">{weightStr(totals.net)} g</dd>
              </div>
              {purchase && (
                <div className="flex gap-1.5">
                  <dt className="text-slate-500">Value{header.applyGst ? " (before GST)" : ""}</dt>
                  <dd className="font-semibold tabular-nums">₹{money(totals.value)}</dd>
                </div>
              )}
            </dl>
            <Button onClick={save} disabled={saving || loading} className="gap-1.5 px-4">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save entry
            </Button>
          </div>
        </section>
      )}

      <RecentEntries refreshKey={refreshKey} />

      <PasteRowsDialog open={pasteOpen} setOpen={setPasteOpen} itemOptions={masters.items} purities={masters.purities} onAppend={appendPasted} />
    </div>
  );
}
