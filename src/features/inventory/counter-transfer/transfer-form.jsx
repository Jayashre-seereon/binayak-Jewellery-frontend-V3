import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ScanLine, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { notifyError, notifyInfo } from "@/utils/notify";
import { getDestinationStores, searchAvailableInventory } from "./transfer-api";

const SEARCH_DEBOUNCE_MS = 300;

const pieceLabel = (inventory) =>
  inventory.inventoryCode || inventory.barcodeNo || inventory.tagNo || `#${inventory.id}`;

const matchesCode = (inventory, code) => {
  const c = String(code || "").trim().toLowerCase();
  if (!c) return false;
  return [inventory.barcodeNo, inventory.tagNo, inventory.huidNo, inventory.inventoryCode]
    .filter(Boolean)
    .some((v) => String(v).toLowerCase() === c);
};

/** Pieces already on the transfer being edited (they are no longer AVAILABLE). */
const initialSelection = (transfer) => {
  const map = new Map();
  (transfer?.items || []).forEach((row) => {
    const inventory = row.inventory || row;
    const id = row.inventoryId ?? inventory?.id;
    if (id) map.set(String(id), { ...inventory, id });
  });
  return map;
};

export default function TransferForm({ open, setOpen, onSave, defaultValues }) {
  const isEditMode = Boolean(defaultValues?.id);
  const [selected, setSelected] = useState(() => initialSelection(defaultValues));
  const [toStoreId, setToStoreId] = useState(defaultValues?.toStoreId ? String(defaultValues.toStoreId) : "");
  const [narration, setNarration] = useState(defaultValues?.narration || "");
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [total, setTotal] = useState(0);
  const [searching, setSearching] = useState(true);
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);
  const timer = useRef(null);

  // Stores and inventory load independently: one failing does not blank the other (INV-10).
  useEffect(() => {
    let active = true;
    getDestinationStores()
      .then((list) => active && setStores(list))
      .catch((error) => active && notifyError(error, "Failed to load stores."))
      .finally(() => active && setStoresLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const runSearch = (value, { addExact = false } = {}) => {
    const id = ++requestId.current;
    return searchAvailableInventory({ search: value.trim() })
      .then(({ inventories, pagination }) => {
        if (id !== requestId.current) return;
        setResults(inventories);
        setTotal(pagination?.total ?? inventories.length);
        if (addExact) {
          const exact = inventories.filter((inv) => matchesCode(inv, value));
          if (exact.length === 1) {
            setSelected((prev) => new Map(prev).set(String(exact[0].id), exact[0]));
            setSearch("");
            notifyInfo(`${pieceLabel(exact[0])} added.`);
          } else if (!inventories.length) {
            notifyInfo(`No available piece found for "${value.trim()}".`);
          }
        }
      })
      .catch((error) => {
        if (id === requestId.current) notifyError(error, "Failed to load inventory.");
      })
      .finally(() => {
        if (id === requestId.current) setSearching(false);
      });
  };

  useEffect(() => {
    runSearch("");
    return () => clearTimeout(timer.current);
  }, []);

  const onSearchChange = (value) => {
    setSearch(value);
    setSearching(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => runSearch(value), SEARCH_DEBOUNCE_MS);
  };

  // Barcode scanners type the code and press Enter: add the exact match directly.
  const onSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    clearTimeout(timer.current);
    if (!search.trim()) return;
    setSearching(true);
    runSearch(search, { addExact: true });
  };

  const toggle = (inventory) => {
    setSelected((prev) => {
      const next = new Map(prev);
      const id = String(inventory.id);
      if (next.has(id)) next.delete(id);
      else next.set(id, inventory);
      return next;
    });
  };

  const selectedList = useMemo(() => [...selected.values()], [selected]);
  const destination = stores.find((store) => String(store.id) === toStoreId) || null;

  const submit = async () => {
    setSaving(true);
    try {
      await onSave({
        toStoreId: Number(toStoreId),
        inventoryIds: selectedList.map((inv) => Number(inv.id)).filter((v) => !Number.isNaN(v)),
        narration,
      });
    } catch {
      // page already showed the error; keep the form open
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !saving && setOpen(value)}>
      <DialogContent className="!w-[95vw] !max-w-[1200px] p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditMode ? `Edit Transfer ${defaultValues.transferNo || ""}` : "Counter Transfer"}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[80vh] space-y-6 overflow-y-auto p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium">To Store</label>
              <Select value={toStoreId} onValueChange={setToStoreId}>
                <SelectTrigger>
                  <SelectValue placeholder={storesLoading ? "Loading stores..." : "Select store"} />
                </SelectTrigger>
                <SelectContent>
                  {stores.map((store) => (
                    <SelectItem key={store.id} value={String(store.id)}>
                      {store.storeName || `Store #${store.id}`}
                      {store.location ? ` — ${store.location}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!storesLoading && !stores.length ? (
                <p className="mt-1 text-xs text-amber-700">No other store is available to transfer to.</p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-medium">Narration</label>
              <Input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder="Enter narration" />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Available stock</div>
                <div className="text-xs text-slate-500">
                  {searching ? "Searching..." : `${results.length} of ${total} shown`}
                </div>
              </div>
              <div className="relative">
                <ScanLine className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-8"
                  value={search}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={onSearchKeyDown}
                  placeholder="Scan barcode / tag or search item, product, HUID"
                  autoFocus
                />
              </div>
              <div className="max-h-80 overflow-y-auto divide-y rounded border">
                {results.map((inventory) => {
                  const checked = selected.has(String(inventory.id));
                  return (
                    <button
                      key={inventory.id}
                      type="button"
                      className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                      onClick={() => toggle(inventory)}
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                          checked ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300"
                        }`}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="flex-1">
                        <span className="font-medium">{pieceLabel(inventory)}</span>
                        <span className="ml-2 text-xs text-slate-500">
                          {[inventory.item?.name || inventory.product?.name, inventory.barcodeNo, inventory.tagNo]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                      <span className="text-xs text-slate-600">{Number(inventory.netWeight || 0).toFixed(3)} g</span>
                    </button>
                  );
                })}
                {!searching && !results.length ? (
                  <div className="p-4 text-center text-sm text-slate-500">No available pieces match.</div>
                ) : null}
              </div>
              {total > results.length ? (
                <p className="text-xs text-slate-500">Refine the search to see more pieces.</p>
              ) : null}
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Selected ({selectedList.length})</div>
                <div className="text-xs text-slate-600">
                  Net {selectedList.reduce((s, inv) => s + Number(inv.netWeight || 0), 0).toFixed(3)} g
                </div>
              </div>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {selectedList.length ? (
                  selectedList.map((inventory) => (
                    <div key={inventory.id} className="flex items-center gap-3 rounded border bg-white px-3 py-2 text-sm">
                      <div className="flex-1">
                        <div className="font-medium">{pieceLabel(inventory)}</div>
                        <div className="text-xs text-slate-500">
                          {[
                            inventory.item?.name || inventory.product?.name,
                            inventory.metal?.name,
                            inventory.barcodeNo && `BC ${inventory.barcodeNo}`,
                            inventory.huidNo && `HUID ${inventory.huidNo}`,
                            inventory.netWeight !== undefined && `${Number(inventory.netWeight || 0).toFixed(3)} g`,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 hover:bg-slate-100"
                        onClick={() => toggle(inventory)}
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-sm text-slate-500">Scan or pick pieces on the left.</div>
                )}
              </div>
              {destination ? (
                <div className="text-xs text-slate-600">
                  Destination: <span className="font-medium">{destination.storeName}</span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving || !selectedList.length || !toStoreId}>
            {saving ? "Saving..." : isEditMode ? "Update" : "Transfer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
