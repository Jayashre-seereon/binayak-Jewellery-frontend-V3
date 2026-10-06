import { Pencil, Printer, Trash } from "lucide-react";
import BarcodeImage from "@/lib/barcode/barcode-image";

const getLabel = (value) => {
  if (value == null) return "-";
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "object") {
    return (
      value.name ||
      value.description ||
      value.id ||
      "-"
    );
  }
  return "-";
};

export default function ItemTable({ data, onEdit, onDelete, onPrintLabel, currentPage, itemsPerPage }) {
  const getImageSrc = (item) => {
    const src = item?.imageUrl || item?.image || item?.photo || "";
    if (!src) return "";
    if (/^https?:\/\//i.test(src) || src.startsWith("data:") || src.startsWith("blob:")) {
      return src;
    }
    return src.startsWith("/") ? src : `/${src}`;
  };

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full min-w-[1000px] text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Item Name</th>
            <th className="p-3 text-left">Reference Image</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-left">Metal</th>
            <th className="p-3 text-left">Design</th>
            <th className="p-3 text-left">Purity</th>
            <th className="p-3 text-left">Grade</th>
            <th className="p-3 text-left">Item code</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
        {data.map((item, index) => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="p-3">  {(currentPage - 1) * itemsPerPage + index + 1}</td>
              <td className="p-3 font-medium">{getLabel(item.name)}</td>
              <td className="p-3">
                {getImageSrc(item) ? (
                  <img
                    src={getImageSrc(item)}
                    alt={item.name || "Item"}
                    className="h-12 w-12 rounded border object-cover"
                  />
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3">{getLabel(item.product?.name || item.product)}</td>
              <td className="p-3">{getLabel(item.product?.category?.name || "-")}</td>
              <td className="p-3">{getLabel(item.product?.metal?.name || "-")}</td>
              <td className="p-3">{getLabel(item.design?.name || item.design)}</td>
              <td className="p-3">
                {item.purity?.name || item.product?.purity?.name ? (
                  <span className="bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded font-medium border border-amber-200">
                    {item.purity?.name || item.product?.purity?.name}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3">
                {item.product?.grade?.name ? (
                  <span className="bg-emerald-50 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium border border-emerald-200">
                    {item.product.grade.name}
                    {item.product.grade.percentage ? ` (${item.product.grade.percentage}%)` : ""}
                  </span>
                ) : (
                  "-"
                )}
              </td>

              <td className="p-3">
                {item.barcode ? (
                  <div className="space-y-0.5">
                    <BarcodeImage code={item.barcode} height={8} scale={1} includeText={0} className="h-8" />
                    <div className="font-mono text-[11px] text-slate-600">{item.barcode}</div>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </td>

              <td className="p-3">
                <div className="flex gap-2">
                  <button type="button" className="p-1 hover:bg-gray-100 rounded" aria-label={`Edit ${item.name}`} title="Edit" onClick={() => onEdit(item)}>
                    <Pencil size={16} className="text-blue-500" />
                  </button>

                  {item.barcode && onPrintLabel && (
                    <button type="button" className="p-1 hover:bg-gray-100 rounded" aria-label={`Print label for ${item.name}`} title="Print label" onClick={() => onPrintLabel(item)}>
                      <Printer size={16} className="text-slate-600" />
                    </button>
                  )}

                  <button type="button" className="p-1 hover:bg-gray-100 rounded" aria-label={`Delete ${item.name}`} title="Delete" onClick={() => onDelete(item)}>
                    <Trash size={16} className="text-red-500" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
