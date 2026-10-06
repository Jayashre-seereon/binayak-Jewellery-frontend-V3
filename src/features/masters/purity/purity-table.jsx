import { Pencil, Trash } from "lucide-react";

export default function PurityTable({ data, metals = [], onEdit, onDelete }) {
  const getMetalLabel = (item) => {
    if (item.metal?.name) return item.metal.name;
    if (item.metalName) return item.metalName;
    if (item.metalId) {
      return metals.find((metal) => metal.id === item.metalId)?.name || `#${item.metalId}`;
    }
    return "-";
  };

  return (
    <div className="bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">SL No</th>
              <th className="p-3 text-left">Purity Name</th>
            <th className="p-3 text-left">Metal</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((item, index) => (
            <tr key={item.id} className="border-t">
             <td className="p-3">{index + 1}</td>
                <td className="p-3">{item.name}</td>
              <td className="p-3">{getMetalLabel(item)}</td>
              <td className="p-3">{item.description}</td>
              <td className="p-3">
                <div className="flex gap-2">
                  <Pencil
                    size={16}
                    className="text-blue-500 cursor-pointer"
                    onClick={() => onEdit(item)}
                  />
                  <Trash
                    size={16}
                    className="text-red-500 cursor-pointer"
                    onClick={() => onDelete(item)}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
