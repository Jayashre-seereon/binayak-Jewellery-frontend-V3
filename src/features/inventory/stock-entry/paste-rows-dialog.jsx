import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { parsePastedRows } from "./stock-entry-model";

/** "Paste from Excel": Item name | Gross | Stone | HUID | Barcode | Pcs | Purity, tab- or comma-separated. */
export default function PasteRowsDialog({ open, setOpen, itemOptions, purities = [], onAppend }) {
  const [text, setText] = useState("");
  const parsed = useMemo(() => parsePastedRows(text, itemOptions, purities), [text, itemOptions, purities]);
  const unmatched = parsed.filter((r) => !r.itemId).length;

  const close = (value) => {
    setOpen(value);
    if (!value) setText("");
  };

  const append = () => {
    if (!parsed.length) return;
    onAppend(parsed);
    close(false);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>Paste from Excel</DialogTitle>
          <DialogDescription>
            Copy the cells from Excel or Google Sheets and paste them below, one piece per line, in this column order:{" "}
            <span className="font-medium text-slate-700">Item name | Gross | Stone | HUID | Barcode | Pcs | Purity</span>. A header row is
            skipped. Blank barcode = generate automatically; blank purity = the item default.
          </DialogDescription>
        </DialogHeader>
        <label htmlFor="stock-entry-paste" className="sr-only">
          Pasted rows
        </label>
        <Textarea
          id="stock-entry-paste"
          autoFocus
          rows={10}
          className="font-mono text-xs"
          placeholder={"LADIES RING\t4.250\t0.120\tAB12CD\t\t1\t22 Carat\nGENTS CHAIN\t18.900\t0\t\t\t1\t22 Carat"}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-slate-600">
            {parsed.length} row{parsed.length === 1 ? "" : "s"} read
            {unmatched > 0 && (
              <span className="ml-1 font-medium text-amber-700">
                · {unmatched} item name{unmatched === 1 ? "" : "s"} not found — they will be highlighted for you to pick the item
              </span>
            )}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={append} disabled={!parsed.length}>
              Add {parsed.length || ""} row{parsed.length === 1 ? "" : "s"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
