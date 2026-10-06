import { useRef, useState } from "react";
import { Barcode, ImageUp, Loader2, Printer, Trash2, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import { assignItemBarcode, generateItemBarcode, getItemLabelPdf, removeItemBarcode } from "@/api/barcode-api";
import BarcodeImage from "@/lib/barcode/barcode-image";
import { decodeBarcodeFromImage, isBarcodeDetectorSupported, openBlob } from "@/lib/barcode/feedback";
import { validateBarcodeText } from "@/lib/barcode/validate";
import { ITEM_CODE_HELP } from "./item-code";

/** Item code actions for a saved item: generate, assign (typed / scanned / from photo), remove, print labels. */
export default function ItemBarcodePanel({ item, onChange }) {
  const [busy, setBusy] = useState(null);
  const [mode, setMode] = useState(null); // null | "assign" | "confirm-generate" | "confirm-remove"
  const [code, setCode] = useState("");
  const [codeError, setCodeError] = useState(null);
  const [copies, setCopies] = useState(1);
  const fileRef = useRef(null);
  const barcode = item?.barcode || null;

  if (!item?.id) return null;

  const run = async (key, fn) => {
    try {
      setBusy(key);
      await fn();
    } catch (error) {
      notifyError(error, "Item code action failed.");
    } finally {
      setBusy(null);
    }
  };

  const doGenerate = () =>
    run("generate", async () => {
      const result = await generateItemBarcode(item.id);
      const next = result?.barcode || result?.item?.barcode;
      notifySuccess(`Item code ${next} generated.`);
      setMode(null);
      onChange?.({ ...item, ...(result?.item || {}), barcode: next });
    });

  const doAssign = () => {
    const value = code.trim();
    const err = validateBarcodeText(value);
    setCodeError(err);
    if (err) return;
    run("assign", async () => {
      const result = await assignItemBarcode(item.id, value);
      notifySuccess(`Item code ${value} assigned to ${item.name}.`);
      setMode(null);
      setCode("");
      onChange?.({ ...item, ...(result?.item || {}), barcode: result?.barcode || value });
    });
  };

  const doRemove = () =>
    run("remove", async () => {
      const result = await removeItemBarcode(item.id);
      notifySuccess("Item code removed.");
      setMode(null);
      onChange?.({ ...item, ...(result || {}), barcode: null });
    });

  const doPrint = () =>
    run("print", async () => {
      const n = Math.min(100, Math.max(1, Number.parseInt(copies, 10) || 1));
      const pdf = await getItemLabelPdf(item.id, n);
      openBlob(pdf, `labels-${barcode}.pdf`);
    });

  const onImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!isBarcodeDetectorSupported()) {
      notifyInfo("This browser cannot read barcodes from photos. Type the digits printed under the barcode instead.");
      return;
    }
    await run("decode", async () => {
      const value = await decodeBarcodeFromImage(file);
      if (!value) {
        notifyInfo("No barcode found in that image. Try a sharper, well-lit photo or type the code.");
        return;
      }
      setCode(value);
      setCodeError(validateBarcodeText(value));
      notifySuccess(`Read barcode ${value} from the image. Check it and press Assign.`);
    });
  };

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3" data-scanner-ignore>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Barcode className="h-4 w-4 text-blue-600" /> Item code (barcode)
        </span>
        {barcode && <span className="font-mono text-xs text-slate-600">{barcode}</span>}
      </div>
      <p className="text-[11px] text-slate-500">{ITEM_CODE_HELP}</p>

      {barcode ? (
        <div className="flex justify-center rounded bg-white p-2">
          <BarcodeImage code={barcode} className="h-16" />
        </div>
      ) : (
        <p className="text-xs text-slate-500">No item code. Generate an in-store EAN-13, or assign the manufacturer's barcode.</p>
      )}

      {mode === "assign" ? (
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <Input
              autoFocus
              aria-label="Item code"
              placeholder="Scan or type the barcode"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setCodeError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  doAssign();
                }
              }}
              className={`h-8 font-mono text-xs ${codeError ? "border-red-500" : ""}`}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              title="Read from a photo"
              aria-label="Read barcode from a photo"
              onClick={() => fileRef.current?.click()}
              disabled={busy === "decode"}
            >
              {busy === "decode" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageUp className="h-3.5 w-3.5" />}
            </Button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onImage} />
          </div>
          {codeError && <p className="text-[11px] text-red-600">{codeError}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={doAssign} disabled={busy === "assign" || !code.trim()}>
              {busy === "assign" ? "Saving…" : barcode ? "Replace" : "Assign"}
            </Button>
          </div>
        </div>
      ) : mode === "confirm-generate" || mode === "confirm-remove" ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
          <span>
            {mode === "confirm-remove"
              ? "Remove this item code? Printed labels will stop scanning."
              : "Replace the current item code? Labels already printed will stop scanning."}
          </span>
          <span className="flex gap-1.5">
            <Button type="button" size="xs" variant="outline" onClick={() => setMode(null)}>
              No
            </Button>
            <Button
              type="button"
              size="xs"
              className={mode === "confirm-remove" ? "bg-red-600 text-white" : ""}
              onClick={mode === "confirm-remove" ? doRemove : doGenerate}
              disabled={Boolean(busy)}
            >
              Yes
            </Button>
          </span>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            disabled={Boolean(busy)}
            onClick={() => (barcode ? setMode("confirm-generate") : doGenerate())}
          >
            {busy === "generate" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />} Generate
          </Button>
          <Button type="button" size="sm" variant="outline" className="gap-1" disabled={Boolean(busy)} onClick={() => setMode("assign")}>
            <Barcode className="h-3.5 w-3.5" /> {barcode ? "Replace with existing" : "Assign existing"}
          </Button>
          {barcode && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="gap-1 text-red-600"
              disabled={Boolean(busy)}
              onClick={() => setMode("confirm-remove")}
            >
              <Trash2 className="h-3.5 w-3.5" /> Remove
            </Button>
          )}
        </div>
      )}

      {barcode && !mode && (
        <div className="flex items-center gap-2 border-t border-slate-200 pt-2">
          <label htmlFor={`item-label-copies-${item.id}`} className="text-xs text-slate-600">
            Labels
          </label>
          <Input
            id={`item-label-copies-${item.id}`}
            type="number"
            min={1}
            max={100}
            value={copies}
            onChange={(e) => setCopies(e.target.value)}
            className="h-8 w-20 text-xs"
          />
          <Button type="button" size="sm" className="gap-1" onClick={doPrint} disabled={busy === "print"}>
            {busy === "print" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} Print label
          </Button>
        </div>
      )}
    </div>
  );
}
