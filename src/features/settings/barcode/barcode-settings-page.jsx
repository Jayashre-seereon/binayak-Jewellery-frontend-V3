import { useEffect, useRef, useState } from "react";
import { Activity, Loader2, RotateCcw, Save, ScanBarcode, Search, Trash2, Usb, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifySuccess } from "@/utils/notify";
import { getBarcodeConfig, saveBarcodeConfig, scanBarcode } from "@/api/barcode-api";
import useBarcodeScanner from "@/hooks/useBarcodeScanner";
import {
  DEFAULT_BARCODE_CONFIG,
  DEVICE_MODES,
  LABEL_FIELDS,
  SERIAL_BAUD_RATES,
  SERIAL_PARITIES,
  SYMBOLOGIES,
  TERMINATORS,
  normalizeBarcodeConfig,
  withEan13CheckDigit,
} from "@/lib/barcode/config";
import { isSerialSupported, SERIAL_UNSUPPORTED_MESSAGE } from "@/lib/barcode/serial";
import { playBeep } from "@/lib/barcode/feedback";
import ScannerStatus from "@/lib/barcode/scanner-status";
import BarcodeImage from "@/lib/barcode/barcode-image";

const MAX_LOG = 60;

function Field({ label, help, children }) {
  return (
    <label className="block space-y-1">
      <span className="text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {help && <span className="block text-[11px] leading-snug text-slate-500">{help}</span>}
    </label>
  );
}

function Toggle({ checked, onChange, label, help }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 cursor-pointer hover:border-slate-300">
      <input type="checkbox" className="mt-0.5 h-4 w-4" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      <span>
        <span className="block text-xs font-semibold text-slate-800">{label}</span>
        {help && <span className="block text-[11px] text-slate-500">{help}</span>}
      </span>
    </label>
  );
}

const selectCls = "h-9 w-full rounded-md border border-slate-300 bg-white px-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";

function Section({ title, description, children }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm space-y-3">
      <div className="border-b border-slate-100 pb-2">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        {description && <p className="text-[11px] text-slate-500">{description}</p>}
      </div>
      {children}
    </section>
  );
}

export default function BarcodeSettingsPage() {
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [log, setLog] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [lookup, setLookup] = useState({ loading: false, data: null, error: null });
  const [testInput, setTestInput] = useState("");
  const logRef = useRef(null);

  useEffect(() => {
    let alive = true;
    getBarcodeConfig({ force: true })
      .then((cfg) => {
        if (!alive) return;
        setSaved(cfg);
        setDraft(cfg);
      })
      .catch((error) => {
        if (!alive) return;
        setLoadError(error?.response?.data?.message || error?.message || "Could not load barcode settings.");
        setSaved(normalizeBarcodeConfig(DEFAULT_BARCODE_CONFIG));
        setDraft(normalizeBarcodeConfig(DEFAULT_BARCODE_CONFIG));
      });
    return () => {
      alive = false;
    };
  }, []);

  const pushLog = (entry) =>
    setLog((prev) => {
      const next = [...prev, { ...entry, t: performance.now() }];
      return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next;
    });

  // The test panel runs against the unsaved draft so changes can be tried before saving.
  const scanner = useBarcodeScanner({
    enabled: Boolean(draft),
    configOverride: draft || undefined,
    onDebug: (evt) => {
      pushLog(evt);
      if (evt.type === "scan" || evt.type === "rejected") {
        setLastResult({ ...evt, at: new Date() });
      }
    },
    onScan: (scan) => {
      if (draft?.beepOnScan) playBeep();
      setLastResult((prev) => ({ ...(prev || {}), type: "scan", raw: scan.raw, code: scan.code, durationMs: scan.durationMs, source: scan.source, at: new Date() }));
      setLookup({ loading: false, data: null, error: null });
    },
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  if (!draft) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading barcode settings…
      </div>
    );
  }

  const set = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const handleSave = async () => {
    const cfg = normalizeBarcodeConfig(draft);
    if (cfg.maxLength < cfg.minLength) {
      notifyError(null, "Maximum length must be at least the minimum length.");
      return;
    }
    if (cfg.symbology === "EAN13" && !/^2\d$/.test(String(cfg.itemBarcodePrefix))) {
      notifyError(null, "For EAN-13 the item code prefix must be in the in-store range 20–29.");
      return;
    }
    try {
      setSaving(true);
      const result = await saveBarcodeConfig(cfg);
      setSaved(result);
      setDraft(result);
      notifySuccess("Barcode settings saved.");
    } catch (error) {
      notifyError(error, "Could not save barcode settings.");
    } finally {
      setSaving(false);
    }
  };

  const runLookup = async (code) => {
    if (!code) return;
    setLookup({ loading: true, data: null, error: null });
    try {
      const data = await scanBarcode(code);
      setLookup({ loading: false, data, error: null });
    } catch (error) {
      setLookup({ loading: false, data: null, error: error?.response?.data?.message || error?.message || "Lookup failed." });
    }
  };

  const toggleLabelField = (value, checked) => {
    const current = new Set(draft.labelFields || []);
    if (checked) current.add(value);
    else current.delete(value);
    set(
      "labelFields",
      LABEL_FIELDS.map((f) => f.value).filter((v) => current.has(v))
    );
  };

  const serialSupported = isSerialSupported();
  const bl = lookup.data?.billingLine;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Barcode Settings</h1>
          <p className="text-xs text-slate-500">Scanner hardware, how scans are recognised, and how item codes / labels are generated for this store.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={!dirty || saving} onClick={() => setDraft(saved)} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Discard
          </Button>
          <Button disabled={!dirty || saving} onClick={handleSave} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save settings
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {loadError} Showing defaults — saving will create the store's configuration.
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 space-y-4">
          <Section title="Scanner device" description="Most USB and Bluetooth scanners work as a keyboard (HID / keyboard wedge). Use Serial only for scanners in COM / virtual-COM mode.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Device mode" help="Keyboard wedge needs no driver; the scanner types the code followed by Enter.">
                <select className={selectCls} value={draft.deviceMode} onChange={(e) => set("deviceMode", e.target.value)}>
                  {DEVICE_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Terminator" help="Key the scanner sends after the code. Check the scanner's manual (often 'CR suffix'). 'None' detects the end of a scan by the pause.">
                <select className={selectCls} value={draft.terminator} onChange={(e) => set("terminator", e.target.value)}>
                  {TERMINATORS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Prefix" help="Characters the scanner adds before every code (e.g. a symbology identifier like ']C1'). Stripped before lookup.">
                <Input className="h-9 text-xs font-mono" value={draft.prefix} onChange={(e) => set("prefix", e.target.value)} placeholder="(none)" />
              </Field>
              <Field label="Suffix" help="Characters added after the code, before the terminator. Stripped before lookup.">
                <Input className="h-9 text-xs font-mono" value={draft.suffix} onChange={(e) => set("suffix", e.target.value)} placeholder="(none)" />
              </Field>
              <Field label="Minimum length" help="Shorter bursts are ignored, so fast typing of short words is never mistaken for a scan.">
                <Input type="number" min={1} max={128} className="h-9 text-xs" value={draft.minLength} onChange={(e) => set("minLength", e.target.value)} />
              </Field>
              <Field label="Maximum length" help="Longer inputs are rejected (protects against a stuck key).">
                <Input type="number" min={1} max={256} className="h-9 text-xs" value={draft.maxLength} onChange={(e) => set("maxLength", e.target.value)} />
              </Field>
              <Field
                label="Inter-key timeout (ms)"
                help="Maximum gap between two keystrokes of one scan. Scanners type every 2–20 ms, people 80+ ms. Raise it (e.g. 80) for slow Bluetooth scanners; lower it if typing triggers scans."
              >
                <Input type="number" min={5} max={1000} className="h-9 text-xs" value={draft.interKeyTimeoutMs} onChange={(e) => set("interKeyTimeoutMs", e.target.value)} />
              </Field>
            </div>
          </Section>

          {draft.deviceMode === "SERIAL" && (
            <Section title="Serial port" description="Settings must match the scanner's configuration (most use 9600 baud, 8 data bits, no parity, 1 stop bit — '9600 8N1').">
              {!serialSupported && <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{SERIAL_UNSUPPORTED_MESSAGE}</div>}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Baud rate">
                  <select className={selectCls} value={draft.serialBaudRate} onChange={(e) => set("serialBaudRate", Number(e.target.value))}>
                    {SERIAL_BAUD_RATES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Data bits">
                  <select className={selectCls} value={draft.serialDataBits} onChange={(e) => set("serialDataBits", Number(e.target.value))}>
                    <option value={7}>7</option>
                    <option value={8}>8</option>
                  </select>
                </Field>
                <Field label="Stop bits">
                  <select className={selectCls} value={draft.serialStopBits} onChange={(e) => set("serialStopBits", Number(e.target.value))}>
                    <option value={1}>1</option>
                    <option value={2}>2</option>
                  </select>
                </Field>
                <Field label="Parity">
                  <select className={selectCls} value={draft.serialParity} onChange={(e) => set("serialParity", e.target.value)}>
                    {SERIAL_PARITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  disabled={!serialSupported || scanner.status === "connecting"}
                  onClick={() => scanner.connectSerial()}
                  className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Usb className="h-4 w-4" /> {scanner.status === "connected" ? "Reconnect device" : "Connect device"}
                </Button>
                {scanner.status === "connected" && (
                  <Button variant="outline" onClick={() => scanner.disconnectSerial()}>
                    Disconnect
                  </Button>
                )}
                <ScannerStatus scanner={scanner} />
              </div>
              <p className="text-[11px] text-slate-500">
                The browser asks once which port to use; afterwards the billing screen reconnects automatically. Port settings are applied on (re)connect.
              </p>
            </Section>
          )}

          <Section title="Billing behaviour">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Toggle
                checked={draft.autoAddToBill}
                onChange={(v) => set("autoAddToBill", v)}
                label="Add to bill on scan"
                help="Off: the scanned piece is shown for confirmation first."
              />
              <Toggle checked={draft.beepOnScan} onChange={(v) => set("beepOnScan", v)} label="Beep on scan" help="Short tone on success, low tone on error." />
              <Toggle
                checked={draft.allowManualEntry}
                onChange={(v) => set("allowManualEntry", v)}
                label="Allow manual entry"
                help="Show the barcode text box on the sales screen."
              />
            </div>
          </Section>

          <Section title="Item codes & labels" description="Used when generating item codes and printing tag labels.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Symbology" help="Code 128 suits alphanumeric tags; EAN-13 is numeric (retail standard); QR holds more data on small tags.">
                <select className={selectCls} value={draft.symbology} onChange={(e) => set("symbology", e.target.value)}>
                  {SYMBOLOGIES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Item code prefix (EAN-13, 20–29)" help="Start of generated EAN-13 item codes. 20–29 is reserved for in-store use so codes never clash with manufacturer barcodes.">
                <Input className="h-9 text-xs font-mono" maxLength={3} value={draft.itemBarcodePrefix} onChange={(e) => set("itemBarcodePrefix", e.target.value.replace(/\D/g, ""))} />
              </Field>
              <Field label="Label width (mm)">
                <Input type="number" min={10} max={200} className="h-9 text-xs" value={draft.labelWidthMm} onChange={(e) => set("labelWidthMm", Number(e.target.value))} />
              </Field>
              <Field label="Label height (mm)">
                <Input type="number" min={10} max={200} className="h-9 text-xs" value={draft.labelHeightMm} onChange={(e) => set("labelHeightMm", Number(e.target.value))} />
              </Field>
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-700">Fields printed on labels</span>
              <div className="mt-1.5 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {LABEL_FIELDS.map((f) => (
                  <label key={f.value} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs">
                    <input type="checkbox" checked={draft.labelFields?.includes(f.value)} onChange={(e) => toggleLabelField(f.value, e.target.checked)} />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 rounded border border-dashed border-slate-300 p-3">
              <span className="text-[11px] text-slate-500">Sample ({draft.symbology}):</span>
              <BarcodeImage
                code={draft.symbology === "EAN13" ? withEan13CheckDigit(`${String(draft.itemBarcodePrefix || "29").slice(0, 2)}0010000017`) : "TAG-S1-000123"}
                symbology={draft.symbology}
                className="h-14"
              />
            </div>
          </Section>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <Section title="Test scanner" description="Scan any barcode while this page is open (no need to click anywhere). The panel uses the settings on the left, including unsaved changes.">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <ScannerStatus scanner={scanner} />
              <Button variant="ghost" size="sm" onClick={() => playBeep()} className="gap-1 text-xs">
                <Volume2 className="h-3.5 w-3.5" /> Test beep
              </Button>
            </div>

            <div className={`rounded-md border p-3 text-xs ${lastResult?.type === "scan" ? "border-emerald-300 bg-emerald-50" : lastResult ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
              {!lastResult ? (
                <div className="flex items-center gap-2 text-slate-500">
                  <ScanBarcode className="h-4 w-4" /> Waiting for a scan…
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="font-semibold">{lastResult.type === "scan" ? "Recognised as a scan" : `Not treated as a scan: ${lastResult.reason || ""}`}</div>
                  <div>
                    Raw: <code className="rounded bg-white px-1 font-mono">{JSON.stringify(lastResult.raw ?? "")}</code>
                  </div>
                  {lastResult.code !== undefined && (
                    <div>
                      Cleaned code: <code className="rounded bg-white px-1 font-mono font-bold">{lastResult.code}</code> ({lastResult.code?.length || 0} chars)
                    </div>
                  )}
                  {lastResult.durationMs !== undefined && <div>Burst duration: {lastResult.durationMs} ms</div>}
                  {lastResult.type === "scan" && lastResult.code && (
                    <Button size="sm" variant="outline" className="mt-1 gap-1" onClick={() => runLookup(lastResult.code)}>
                      <Search className="h-3.5 w-3.5" /> Look up in stock
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2" data-scanner-ignore>
              <Input
                placeholder="Or type a code to look up"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runLookup(testInput.trim())}
                className="h-8 text-xs"
              />
              <Button size="sm" variant="outline" onClick={() => runLookup(testInput.trim())} disabled={!testInput.trim()}>
                Look up
              </Button>
            </div>

            {(lookup.loading || lookup.data || lookup.error) && (
              <div className="rounded-md border border-slate-200 p-3 text-xs">
                {lookup.loading && (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Looking up…
                  </span>
                )}
                {lookup.error && <span className="font-semibold text-red-600">{lookup.error}</span>}
                {bl && (
                  <dl className="grid grid-cols-[110px_1fr] gap-x-2 gap-y-0.5">
                    <dt className="text-slate-500">Matched by</dt>
                    <dd className="font-semibold">{lookup.data.matchType}</dd>
                    <dt className="text-slate-500">Item</dt>
                    <dd className="font-semibold">{bl.particulars}</dd>
                    <dt className="text-slate-500">Code / HUID</dt>
                    <dd className="font-mono">
                      {bl.itemCode} {bl.huidNo ? `· ${bl.huidNo}` : ""}
                    </dd>
                    <dt className="text-slate-500">Purity</dt>
                    <dd>{bl.purityName || "-"}</dd>
                    <dt className="text-slate-500">Gross / Net</dt>
                    <dd>
                      {Number(bl.grossWeight || 0).toFixed(3)} / {Number(bl.netWeight || 0).toFixed(3)} g
                    </dd>
                    <dt className="text-slate-500">Rate</dt>
                    <dd className={Number(bl.rate) > 0 ? "" : "font-semibold text-red-600"}>
                      {Number(bl.rate) > 0 ? `₹${Number(bl.rate).toFixed(2)} / g (${bl.rateSource})` : "Not set in Rate Master"}
                    </dd>
                    <dt className="text-slate-500">Making</dt>
                    <dd>
                      {bl.makingChargeType} {bl.makingChargeRate}
                    </dd>
                  </dl>
                )}
              </div>
            )}

            <div>
              <div className="mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs font-semibold text-slate-700">
                  <Activity className="h-3.5 w-3.5" /> Keystroke log
                </span>
                <Button variant="ghost" size="xs" onClick={() => setLog([])} className="gap-1 text-[11px]">
                  <Trash2 className="h-3 w-3" /> Clear
                </Button>
              </div>
              <div ref={logRef} className="h-56 overflow-y-auto rounded border border-slate-200 bg-slate-950 p-2 font-mono text-[11px] leading-relaxed text-slate-200">
                {log.length === 0 ? (
                  <span className="text-slate-500">Keys appear here with the gap (ms) since the previous key.</span>
                ) : (
                  log.map((e, i) => (
                    <div key={i} className={e.type === "scan" ? "text-emerald-400" : e.type === "rejected" ? "text-amber-400" : e.type === "serial" ? "text-sky-300" : ""}>
                      {e.type === "key" && (
                        <>
                          <span className="text-slate-500">+{String(e.gap).padStart(4, " ")}ms</span> {e.terminator ? `[${e.key}]` : JSON.stringify(e.key)}{" "}
                          {e.gap > draft.interKeyTimeoutMs && !e.terminator ? <span className="text-slate-500">(new burst)</span> : null}
                        </>
                      )}
                      {e.type === "scan" && `✔ scan "${e.code}" (${e.durationMs} ms, ${e.reason})`}
                      {e.type === "rejected" && `✖ ignored "${e.raw}" — ${e.reason}`}
                      {e.type === "serial" && `serial line ${JSON.stringify(e.raw)} → "${e.code}"`}
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
