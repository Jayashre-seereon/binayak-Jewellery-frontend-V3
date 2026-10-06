import { Pencil, Trash } from "lucide-react";

export default function PartyTypeTable({ data, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Sl No</th>
            <th className="p-3 text-left">Party Type</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="p-3 text-center text-gray-400" colSpan={4}>
                No party types found
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{item.name}</td>
                <td className="p-3">{item.description}</td>

                <td className="p-3">
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Pencil
                        size={16}
                        className="text-blue-500"
                        onClick={() => onEdit(item)}
                      />
                    </button>

                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Trash
                        size={16}
                        className="text-red-500"
                        onClick={() => onDelete(item.id)}
                      />
                    </button>
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