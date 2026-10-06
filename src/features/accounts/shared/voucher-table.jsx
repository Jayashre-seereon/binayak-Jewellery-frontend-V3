import { Pencil, Eye, Trash } from "lucide-react";

export default function VoucherTable({ data, onEdit, onDelete }) {
  return (
    <div className="bg-white border rounded">

      <table className="w-full text-sm">

        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">Voucher</th>
            <th className="p-3 text-left">Date</th>
            <th className="p-3 text-left">Debit</th>
            <th className="p-3 text-left">Credit</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((v) => (
            <tr key={v.id} className="border-t">

              <td className="p-3">{v.voucher}</td>
              <td className="p-3">{v.date}</td>
              <td className="p-3">₹{v.totalDebit}</td>
              <td className="p-3">₹{v.totalCredit}</td>

              <td className="p-3 flex gap-3">
                <Eye size={16} className="cursor-pointer text-gray-500" />
                <Pencil size={16} className="cursor-pointer text-blue-500" onClick={()=>onEdit(v)} />
                <Trash size={16} className="cursor-pointer text-red-500" onClick={()=>onDelete(v.id)} />
              </td>

            </tr>
          ))}
        </tbody>

      </table>

    </div>
  );
}