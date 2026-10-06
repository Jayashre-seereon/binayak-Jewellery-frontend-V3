import { Pencil, Trash } from "lucide-react";

export default function ProductTable({ data, onEdit, onDelete }) {
  const getCategoryLabel = (item) =>
    item.category?.name || item.categoryName || item.category || "-";

  const getMetalLabel = (item) => item.metal?.name || item.metalName || item.metal || "-";

  return (
    <div className="bg-white rounded-lg border overflow-x-auto">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">SL No</th>
            <th className="p-3 text-left">Reference Image</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Category</th>
            <th className="p-3 text-left">Metal</th>
            <th className="p-3 text-left">Purity</th>
            <th className="p-3 text-left">Grade</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item.id} className="border-t">
              <td className="p-3">{index + 1}</td>
              <td className="p-3">
                {item.image ? (
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-12 w-12 rounded object-cover"
                  />
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3">{item.name}</td>
              <td className="p-3">{getCategoryLabel(item)}</td>
              <td className="p-3">{getMetalLabel(item)}</td>
              <td className="p-3">
                {item.purity?.name ? (
                  <span className="bg-amber-50 text-amber-800 text-xs px-2 py-0.5 rounded font-medium border border-amber-200">
                    {item.purity.name}
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3">
                {item.grade?.name ? (
                  <span className="bg-emerald-50 text-emerald-800 text-xs px-2 py-0.5 rounded font-medium border border-emerald-200">
                    {item.grade.name} ({item.grade.percentage}%)
                  </span>
                ) : (
                  "-"
                )}
              </td>
              <td className="p-3">{item.description}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Pencil size={16} className="text-blue-500 cursor-pointer" onClick={() => onEdit(item)} />
                  <Trash size={16} className="text-red-500 cursor-pointer" onClick={() => onDelete(item.id)} />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
