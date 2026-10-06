import { Pencil, Trash } from "lucide-react";

export default function CategoryTable({ data, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">SL No</th>
            <th className="p-3 text-left">Category Name</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length > 0 ? (
            data.map((item, index) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{index + 1}</td> {/* ✅ SL No */}
                <td className="p-3">{item.name}</td>
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
                      onClick={() => onDelete(item)} // ✅ pass full item
                    />
                  </div>
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="4" className="text-center p-3">
                No data found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}