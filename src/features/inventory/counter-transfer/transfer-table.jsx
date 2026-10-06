import { CheckCircle2, Pencil, XCircle } from "lucide-react";

const statusClass = {
  PENDING: "bg-amber-100 text-amber-800",
  RECEIVED: "bg-emerald-100 text-emerald-800",
  CANCELLED: "bg-rose-100 text-rose-800",
};

/**
 * Actions follow the transfer's state (INV-12): only the source store can edit or cancel
 * a PENDING transfer; only the destination store can receive it.
 */
export default function TransferTable({ data, activeStoreId, onEdit, onCancel, onReceive }) {
  return (
    <div className="overflow-hidden rounded border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Transfer No</th>
            <th className="p-3 text-left">Pieces</th>
            <th className="p-3 text-left">From Store</th>
            <th className="p-3 text-left">To Store</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-6 text-center text-slate-500">
                No transfers yet.
              </td>
            </tr>
          ) : null}
          {data.map((transfer) => {
            const items = transfer.items || [];
            const first = items[0]?.inventory || items[0] || {};
            const status = transfer.status || "PENDING";
            const pending = status === "PENDING";
            const isSource = String(transfer.fromStoreId) === String(activeStoreId);
            const isDestination = String(transfer.toStoreId) === String(activeStoreId);
            const relabel = items.filter((row) => row.relabelRequired || row.extraDetails?.relabelRequired).length;

            return (
              <tr key={transfer.id} className="border-t">
                <td className="p-3">{transfer.transferNo || `#${transfer.id}`}</td>
                <td className="p-3">
                  {first.inventoryCode || first.barcodeNo || "-"}
                  {items.length > 1 ? <span className="text-xs text-slate-500"> +{items.length - 1} more</span> : null}
                  {relabel ? (
                    <div className="text-xs text-amber-700">{relabel} piece(s) need new labels</div>
                  ) : null}
                </td>
                <td className="p-3">{transfer.fromStore?.storeName || transfer.fromStore?.location || transfer.fromStoreId || "-"}</td>
                <td className="p-3">{transfer.toStore?.storeName || transfer.toStore?.location || transfer.toStoreId || "-"}</td>
                <td className="p-3">
                  <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusClass[status] || "bg-slate-100 text-slate-800"}`}>
                    {status}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    {pending && isSource ? (
                      <button
                        type="button"
                        className="rounded p-1 text-slate-600 hover:bg-slate-100"
                        onClick={() => onEdit?.(transfer)}
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                    ) : null}
                    {pending && isDestination ? (
                      <button
                        type="button"
                        className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                        onClick={() => onReceive?.(transfer)}
                        title="Receive"
                      >
                        <CheckCircle2 size={16} />
                      </button>
                    ) : null}
                    {pending && isSource ? (
                      <button
                        type="button"
                        className="rounded p-1 text-rose-600 hover:bg-rose-50"
                        onClick={() => onCancel?.(transfer)}
                        title="Cancel"
                      >
                        <XCircle size={16} />
                      </button>
                    ) : null}
                    {!pending ? <span className="text-xs text-slate-400">—</span> : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
