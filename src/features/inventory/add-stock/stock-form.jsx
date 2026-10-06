import { useEffect, useMemo, useRef, useState } from "react";
import { Select as AntSelect } from "antd";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError } from "@/utils/notify";
import { getPurchasesPendingInventory, getUntaggedPurchaseItems } from "@/api/purchase-api";
import { getOldPurchases } from "@/api/old-purchase-api";

const SEARCH_DEBOUNCE_MS = 300;

// Which purchases can be tagged. OLD gold is normally melted, so it is listed only when asked for.
const TYPE_FILTERS = [
  { value: "NEW", label: "Ornament & Bullion", types: ["ORNAMENT", "BULLION"] },
  { value: "ORNAMENT", label: "Ornament", types: ["ORNAMENT"] },
  { value: "BULLION", label: "Bullion", types: ["BULLION"] },
  { value: "OLD", label: "Old gold", types: ["OLD"] },
];

const weight = (v) => `${Number(v || 0).toFixed(3)} g`;
const purchaseLabel = (p) =>
  `${p.invoiceNo || `#${p.id}`} · ${p.purchaseType} · ${p.party?.name || p.customerName || "-"}${
    Array.isArray(p.items) ? ` (${p.items.length} untagged)` : ""
  }`;

/** Create pieces from purchase lines that are not yet in inventory (INV-16). */
function CreateInventory({ onCreate, onClose }) {
  const [typeFilter, setTypeFilter] = useState("NEW");
  const [search, setSearch] = useState("");
  const [purchases, setPurchases] = useState([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);
  const [purchaseId, setPurchaseId] = useState(null);
  const [lines, setLines] = useState([]);
  const [loadingLines, setLoadingLines] = useState(false);
  const [checked, setChecked] = useState([]);
  const [busy, setBusy] = useState(false);
  const pendingEndpoint = useRef(true);
  const requestId = useRef(0);
  const timer = useRef(null);

  const types = TYPE_FILTERS.find((f) => f.value === typeFilter)?.types || [];

  const fetchPurchases = (filter, text) => {
    const id = ++requestId.current;
    const wanted = TYPE_FILTERS.find((f) => f.value === filter)?.types || [];
    const purchaseType = wanted.length === 1 ? wanted[0] : undefined;

    const viaPending = () =>
      getPurchasesPendingInventory({ purchaseType, search: text }).then((list) =>
        list.filter((p) => wanted.includes(p.purchaseType) && (p.items?.length ?? 1) > 0)
      );
    // Older servers have no pending-inventory endpoint: fall back to the paginated list.
    const viaList = () =>
      getOldPurchases({ page: 1, limit: 50, search: text || undefined, purchaseType }).then(({ purchases: list }) =>
        // the list's items include tagged lines, so they are fetched per purchase instead
        list.filter((p) => wanted.includes(p.purchaseType)).map((p) => ({ ...p, items: undefined }))
      );

    const run = pendingEndpoint.current
      ? viaPending().catch((error) => {
          if (error.response?.status === 404) {
            pendingEndpoint.current = false;
            return viaList();
          }
          throw error;
        })
      : viaList();

    return run
      .then((list) => {
        if (id === requestId.current) setPurchases(list);
      })
      .catch((error) => {
        if (id === requestId.current) notifyError(error, "Failed to load purchases.");
      })
      .finally(() => {
        if (id === requestId.current) setLoadingPurchases(false);
      });
  };

  useEffect(() => {
    fetchPurchases("NEW", "");
    return () => clearTimeout(timer.current);
  }, []);

  const changeType = (value) => {
    setTypeFilter(value);
    setPurchaseId(null);
    setLines([]);
    setChecked([]);
    setLoadingPurchases(true);
    fetchPurchases(value, search.trim());
  };

  const changeSearch = (value) => {
    setSearch(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoadingPurchases(true);
      fetchPurchases(typeFilter, value.trim());
    }, SEARCH_DEBOUNCE_MS);
  };

  const selectPurchase = async (value) => {
    setPurchaseId(value ?? null);
    setChecked([]);
    setLines([]);
    if (!value) return;
    const local = purchases.find((p) => String(p.id) === String(value));
    if (Array.isArray(local?.items)) {
      setLines(local.items);
      setChecked(local.items.map((row) => row.id));
      return;
    }
    setLoadingLines(true);
    try {
      const rows = await getUntaggedPurchaseItems(value);
      setLines(rows);
      setChecked(rows.map((row) => row.id));
    } catch (error) {
      notifyError(error, "Failed to load purchase items.");
    } finally {
      setLoadingLines(false);
    }
  };

  const toggle = (id) =>
    setChecked((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allChecked = lines.length > 0 && lines.every((row) => checked.includes(row.id));

  const create = async (ids, printLabels) => {
    setBusy(true);
    try {
      await onCreate(ids, { printLabels });
    } finally {
      setBusy(false);
    }
  };

  const selectedPurchase = purchases.find((p) => String(p.id) === String(purchaseId));

  return (
    <div className="flex h-[calc(88vh-72px)] flex-col overflow-hidden">
      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <div className="grid gap-4 rounded-xl border bg-slate-50 p-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium">Purchase type</label>
            <select
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={typeFilter}
              onChange={(e) => changeType(e.target.value)}
            >
              {TYPE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 relative">
            <label className="mb-1 block text-sm font-medium">Invoice</label>
            <AntSelect
              showSearch={{ filterOption: false, onSearch: changeSearch }}
              allowClear
              className="w-full"
              style={{ height: 36 }}
              placeholder="Search invoice no, party or customer"
              loading={loadingPurchases}
              value={purchaseId ?? undefined}
              onChange={selectPurchase}
              options={purchases.map((p) => ({ value: p.id, label: purchaseLabel(p) }))}
              notFoundContent={loadingPurchases ? "Loading..." : `No ${types.join("/").toLowerCase()} purchase waiting for inventory`}
              getPopupContainer={(trigger) => trigger.parentElement}
            />
          </div>
        </div>

        <div className="rounded-xl border">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="text-sm font-semibold">
              Lines without inventory {selectedPurchase ? `— ${selectedPurchase.invoiceNo || `#${selectedPurchase.id}`}` : ""}
            </div>
            <div className="text-xs text-slate-500">{checked.length} selected</div>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="w-10 p-2 text-left">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    disabled={!lines.length}
                    onChange={(e) => setChecked(e.target.checked ? lines.map((row) => row.id) : [])}
                  />
                </th>
                <th className="p-2 text-left">Line</th>
                <th className="p-2 text-left">Item</th>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Purity</th>
                <th className="p-2 text-center">Pcs</th>
                <th className="p-2 text-right">Gross</th>
                <th className="p-2 text-right">Net</th>
                <th className="p-2 text-left">HUID</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">
                    <input type="checkbox" checked={checked.includes(row.id)} onChange={() => toggle(row.id)} />
                  </td>
                  <td className="p-2">{row.purchaseItemCode || `#${row.id}`}</td>
                  <td className="p-2">{row.item?.name || "-"}</td>
                  <td className="p-2">{row.product?.name || "-"}</td>
                  <td className="p-2">{row.purityMaster?.name || row.purity?.name || "-"}</td>
                  <td className="p-2 text-center">{row.pieces ?? 1}</td>
                  <td className="p-2 text-right">{weight(row.grossWeight)}</td>
                  <td className="p-2 text-right">{weight(row.netWeight)}</td>
                  <td className="p-2">{row.huidNo || "-"}</td>
                </tr>
              ))}
              {!lines.length ? (
                <tr>
                  <td colSpan={9} className="p-4 text-center text-slate-500">
                    {loadingLines
                      ? "Loading lines..."
                      : purchaseId
                      ? "Every line of this purchase is already in inventory."
                      : "Select an invoice to see its untagged lines."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="button" variant="outline" disabled={busy || !checked.length} onClick={() => create(checked, false)}>
          Create {checked.length || ""} piece(s)
        </Button>
        <Button type="button" disabled={busy || !checked.length} onClick={() => create(checked, true)}>
          {busy ? "Creating..." : "Create & print labels"}
        </Button>
      </div>
    </div>
  );
}

const EDITABLE = [
  { name: "huidNo", label: "HUID No" },
  { name: "hsnCode", label: "HSN/SAC" },
  { name: "barSerialNo", label: "Bar Serial No" },
  { name: "assayCertNo", label: "Assay Certificate No" },
  { name: "narration", label: "Narration", wide: true },
];

/** Edit an existing piece: identifiers and weights are locked (INV-07). */
function EditInventory({ inventory, onUpdate, onClose }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(EDITABLE.map((f) => [f.name, inventory[f.name] ?? ""]))
  );
  const [busy, setBusy] = useState(false);
  const locked = ["SOLD", "PENDING"].includes(inventory.status);
  const facts = useMemo(() => {
    const purchaseItem = inventory.purchaseItem || {};
    return [
      ["Status", inventory.status || "AVAILABLE"],
      ["Inventory Code", inventory.inventoryCode],
      ["Barcode No", inventory.barcodeNo],
      ["Tag No", inventory.tagNo],
      ["Invoice", inventory.purchase?.invoiceNo],
      ["Purchase Item", purchaseItem.purchaseItemCode || inventory.purchaseItemCode],
      ["Item", inventory.item?.name || purchaseItem.item?.name],
      ["Product", inventory.product?.name || purchaseItem.product?.name],
      ["Metal", inventory.metal?.name],
      ["Purity", inventory.purityMaster?.name || inventory.purity],
      ["Gross Weight", weight(inventory.grossWeight)],
      ["Stone Weight", weight(inventory.stoneWeight)],
      ["Net Weight", weight(inventory.netWeight)],
    ];
  }, [inventory]);

  const submit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(
      EDITABLE.map((f) => [f.name, String(values[f.name] ?? "").trim() || null])
    );
    setBusy(true);
    try {
      await onUpdate(payload);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex h-[calc(88vh-72px)] flex-col overflow-hidden">
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
        {locked ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            This piece is {inventory.status}; it cannot be edited.
          </div>
        ) : null}
        <div className="grid gap-3 rounded-xl border bg-slate-50 p-4 md:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <div className="text-xs text-gray-500">{label}</div>
              <div className="text-sm font-medium">{value === null || value === undefined || value === "" ? "-" : value}</div>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Editable details</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {EDITABLE.map((f) => (
              <div key={f.name} className={f.wide ? "md:col-span-2" : undefined}>
                <label className="mb-1 block text-sm font-medium">{f.label}</label>
                <Input
                  value={values[f.name]}
                  disabled={locked}
                  onChange={(e) => setValues((prev) => ({ ...prev, [f.name]: e.target.value }))}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500">
            Barcode, tag and weights are fixed once a piece is created so printed labels stay valid.
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-3 border-t px-6 py-4">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" disabled={busy || locked}>
          {busy ? "Saving..." : "Update Inventory"}
        </Button>
      </div>
    </form>
  );
}

export default function StockForm({ open, setOpen, onCreate, onUpdate, defaultValues }) {
  const isEditMode = Boolean(defaultValues?.id);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="!w-[95vw] !max-w-[1100px] h-[88vh] overflow-hidden p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{isEditMode ? "Update Inventory" : "Add Inventory"}</DialogTitle>
        </DialogHeader>
        {isEditMode ? (
          <EditInventory inventory={defaultValues} onUpdate={onUpdate} onClose={() => setOpen(false)} />
        ) : (
          <CreateInventory onCreate={onCreate} onClose={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}
