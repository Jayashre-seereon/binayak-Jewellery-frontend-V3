import { Pencil, Trash } from "lucide-react";

export default function GradeTable({ data, purities = [], onEdit, onDelete }) {
  const getPurityLabel = (item) => {
    if (item.purity?.name) return item.purity.name;
    if (item.purityName) return item.purityName;
    if (item.purityId) {
      return (
        purities.find((purity) => purity.id === item.purityId)?.name ||
        `#${item.purityId}`
      );
    }
    return "-";
  };

  return (
    <div className="bg-white rounded-lg border">
    <table className="w-full text-sm">
             <thead className="bg-gray-50">
        <tr>
          <th className="p-2 border">SL No</th>
          <th className="p-2 border">Grade Name</th>
          <th className="p-2 border">Purity</th>
          <th className="p-2 border">%</th>
          <th className="p-2 border">Description</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="6" className="text-center p-3">
              No data found
            </td>
          </tr>
        ) : (
          data.map((item, index) => (
            <tr key={item.id} className="border">
              <td className="p-2 border">{index + 1}</td>
              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{getPurityLabel(item)}</td>
              <td className="p-2 border">{item.percentage}</td>
              <td className="p-2 border">{item.description}</td>
              <td className="p-2 border flex gap-2">
                <Pencil
                  size={16}
                  className="text-blue-500 cursor-pointer"
                  onClick={() => onEdit(item)}
                />
                <Trash
                  size={16}
                  className="text-red-500 cursor-pointer"
                  onClick={() => onDelete(item.id)}
                />
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    </div>
  );
}