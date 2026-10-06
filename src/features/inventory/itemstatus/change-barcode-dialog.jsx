import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { changeInventoryBarcode } from "@/api/barcode-api";
import { cleanScannedCode } from "@/lib/barcode/config";
import { validateBarcodeText } from "@/lib/barcode/validate";
import { notifyError, notifySuccess } from "@/utils/notify";

/** Gives an AVAILABLE / RESERVED piece a new barcode (lost label, adopting a manufacturer tag). */
export default function ChangeBarcodeDialog({ open, setOpen, inventory, scanConfig, onChanged }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const close = (value) => {
    if (saving) return;
    setOpen(value);
    if (!value) {
      setCode("");
      setError(null);
    }
  };

  const submit = async () => {
    const value = cleanScannedCode(code, scanConfig);
    const err =
      validateBarcodeText(value) ||
      (inventory?.barcodeNo && value.toUpperCase() === String(inventory.barcodeNo).toUpperCase() ? "This is already the piece's barcode." : null);
    setError(err);
    if (err) return;
    try {
      setSaving(true);
      const updated = await changeInventoryBarcode(inventory.id, value);
      notifySuccess(`Barcode changed to ${value}. Print a new label for this piece.`);
      setSaving(false);
      close(false);
      onChanged?.(updated?.barcodeNo || value);
    } catch (e) {
      setSaving(false);
      notifyError(e, "Could not change the barcode.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[440px]" data-scanner-ignore>
        <DialogHeader>
          <DialogTitle>Change barcode</DialogTitle>
          <DialogDescription>
            Scan or type the new barcode for {inventory?.item?.name || inventory?.inventoryCode || "this piece"}. The current code (
            <span className="font-mono">{inventory?.barcodeNo || "none"}</span>) is kept in the piece's history and stops scanning.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1">
          <label htmlFor="new-piece-barcode" className="text-sm font-medium text-slate-700">
            New barcode
          </label>
          <Input
            id="new-piece-barcode"
            autoFocus
            autoComplete="off"
            className={`font-mono ${error ? "border-red-500" : ""}`}
            value={code}
            onChange={(e) => {
              setCode(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="mt-2 flex justify-end gap-2">
          <Button variant="outline" onClick={() => close(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !code.trim()} className="gap-1.5">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Change barcode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
