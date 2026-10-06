import { Pencil, Trash } from "lucide-react";

export default function PartyOpeningTable({ data, onEdit, onDelete }) {
  return (
    <div className="bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Sl No</th>
            <th className="p-3 text-left">Party</th>
            <th className="p-3 text-left">Metal</th>
            <th className="p-3 text-left capitalize">Type</th>
            <th className="p-3 text-left">Debit</th>
            <th className="p-3 text-left">Credit</th>
            <th className="p-3 text-left">Year</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.length === 0 ? (
            <tr>
              <td className="p-3 text-center text-gray-400" colSpan={8}>
                No opening balances found
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{index + 1}</td>
                <td className="p-3">{item.partymaster?.name || "-"}</td>
                <td className="p-3">{item.metal?.name || "-"}</td>
                <td className="p-3 capitalize">{item.type}</td>
                <td className="p-3">{item.debit}</td>
                <td className="p-3">{item.credit}</td>
                <td className="p-3">{item.year}</td>

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