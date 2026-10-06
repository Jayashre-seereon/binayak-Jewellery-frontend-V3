import { PencilLine, Printer, Trash2 } from "lucide-react";
import { STATUS_TRANSITIONS } from "@/api/stock-api";


const label = (value) => {
  if (!value) return "-";
  if (typeof value === "object") {
    return (
      value.name ||
      value.purchaseItemCode ||
      value.invoiceNo ||
      `#${value.id ?? ""}`
    );
  }
  return value;
};

const getProductName = (row) =>
  label(row.product?.name || row.product?.productName || row.product);

const formatPurchaseType = (value) => {
  if (!value) return "-";
  return value
    .toString()
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function StockTable({
  data,
  onEdit,
  onDelete,
  onStatusChange,
  onPrintLabel,
  selectedIds = [],
  onToggleSelect,
  onToggleSelectAll,
}) {
  const allSelected =
    data.length > 0 && data.every((row) => selectedIds.includes(row.id));

  return (
    <div className="w-full overflow-x-auto rounded border bg-white shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left w-10">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={(e) => onToggleSelectAll?.(e.target.checked)}
              />
            </th>
            <th className="p-3 text-left">Inventory Code</th>
            <th className="p-3 text-left">Invoice No</th>
            <th className="p-3 text-left">Purchase Type</th>
            <th className="p-3 text-left">Purchase Item</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-center">Pcs</th>
            <th className="p-3 text-right">Gross Wt</th>
            <th className="p-3 text-right">Net Wt</th>
            <th className="p-3 text-left">Tag No</th>
            <th className="p-3 text-left">Barcode</th>
            <th className="p-3 text-left">HSN/SAC</th>
            <th className="p-3 text-left">HUID No</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-right">Action</th>
          </tr>
        </thead>

        <tbody>
          {data.length ? (
            data.map((row) => (
              <tr key={row.id} className="border-t">
                <td className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(row.id)}
                    onChange={() => onToggleSelect?.(row.id)}
                  />
                </td>
                <td className="p-3">{row.inventoryCode || "-"}</td>
                <td className="p-3">
                  {row.purchase?.invoiceNo || row.purchaseInvoiceNo || "-"}
                </td>
                <td className="p-3">
                  {formatPurchaseType(
                    row.purchaseType || row.purchase?.purchaseType
                  )}
                </td>
                <td className="p-3">
                  {row.purchaseItem?.purchaseItemCode ||
                    row.purchaseItemCode ||
                    "-"}
                </td>
                <td className="p-3">{getProductName(row)}</td>
                <td className="p-3 text-center font-semibold">{row.pieces ?? row.purchaseItem?.pieces ?? 1}</td>
                <td className="p-3 text-right">{Number(row.grossWeight ?? row.purchaseItem?.grossWeight ?? 0).toFixed(3)}g</td>
                <td className="p-3 text-right font-medium text-blue-900">{Number(row.netWeight ?? row.purchaseItem?.netWeight ?? 0).toFixed(3)}g</td>
                <td className="p-3">{row.tagNo || "-"}</td>
                <td className="p-3">{row.barcodeNo || "-"}</td>
                <td className="p-3 font-mono text-xs">{row.hsnCode || row.purchaseItem?.hsnCode || "711319"}</td>
                <td className="p-3 font-semibold text-blue-900">{row.huidNo || row.purchaseItem?.huidNo || "-"}</td>
                <td className="p-3">
                  {(() => {
                    const currentStatus = row.status || "AVAILABLE";

                    const STATUS_COLORS = {
                      AVAILABLE: "border-green-300 bg-green-50 text-green-700",
                      RESERVED: "border-yellow-300 bg-yellow-50 text-yellow-700",
                      PENDING: "border-orange-300 bg-orange-50 text-orange-700",
                      SOLD: "border-red-300 bg-red-50 text-red-700",
                      MELTED: "border-purple-300 bg-purple-50 text-purple-700",
                      REFINED: "border-blue-300 bg-blue-50 text-blue-700",
                      DAMAGED: "border-gray-300 bg-gray-100 text-gray-700",
                    };

                    const statusColor =
                      STATUS_COLORS[currentStatus] ||
                      "border-gray-300 bg-white text-gray-700";

                    const nextStatuses = STATUS_TRANSITIONS[currentStatus] || [];

                    return (
                      <div className="flex flex-col items-start gap-1">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${statusColor}`}
                        >
                          {currentStatus}
                        </span>
                        {nextStatuses.length && onStatusChange ? (
                          <select
                            className="h-7 rounded border border-slate-200 bg-white px-1 text-xs text-slate-600"
                            value=""
                            onChange={(e) => e.target.value && onStatusChange(row, e.target.value)}
                            aria-label="Change status"
                          >
                            <option value="">Change to…</option>
                            {nextStatuses.map((s) => (
                              <option key={s} value={s}>
                                {s}
                              </option>
                            ))}
                          </select>
                        ) : null}
                      </div>
                    );
                  })()}
                </td>
                <td className="p-3">
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => onEdit?.(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-blue-600 transition hover:bg-blue-50 hover:text-blue-700"
                      aria-label="Edit inventory"
                      title="Edit"
                    >
                      <PencilLine size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete?.(row.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-500 transition hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete inventory"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrintLabel?.(row)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md text-emerald-600 transition hover:bg-emerald-50 hover:text-emerald-700"
                      aria-label="Print inventory label"
                      title="Print Label"
                    >
                      <Printer size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td className="p-4 text-center text-gray-500" colSpan={15}>
                No inventory records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}