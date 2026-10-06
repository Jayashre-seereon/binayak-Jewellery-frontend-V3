import { Pencil, Trash } from "lucide-react";

export default function DesignTable({ data, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border">
    <table className="w-full text-sm">
      <thead  className="bg-gray-50">
        <tr>
          <th className="p-2 border">SL No</th>
          <th className="p-2 border">Reference Image</th>
          <th className="p-2 border">Design Name</th>
          <th className="p-2 border">Description</th>
          <th className="p-2 border">Actions</th>
        </tr>
      </thead>

      <tbody>
        {data.length === 0 ? (
          <tr>
            <td colSpan="5" className="text-center p-3">
              No data found
            </td>
          </tr>
        ) : (
          data.map((item, index) => (
            <tr key={item.id} className="border">
              <td className="p-2 border">{index + 1}</td>

              <td className="p-2 border">
                {item.image || item.imageUrl ? (
                  <img
                    src={item.image || item.imageUrl}
                    alt="design"
                    className="w-12 h-12 object-cover rounded"
                  />
                ) : (
                  "-"
                )}
              </td>

              <td className="p-2 border">{item.name}</td>
              <td className="p-2 border">{item.description}</td>

              <td className="p-2 border">
                <div className="flex gap-2">
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
                </div>
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
    </div>
  );
}
