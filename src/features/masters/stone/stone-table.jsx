import { Pencil, Trash } from "lucide-react";

export default function StoneTable({ data, products, items, onEdit, onDelete }) {
  const productList = Array.isArray(products) ? products : [];
  const itemList = Array.isArray(items) ? items : [];

  const productName = (stone) =>
    stone?.product?.name ||
    productList.find((p) => String(p.id) === String(stone?.productId))?.name ||
    "-";

  const itemName = (stone) =>
    stone?.item?.name ||
    itemList.find((i) => String(i.id) === String(stone?.itemId))?.name ||
    "-";

  return (
    <div className="bg-white rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left">S.No</th>
            <th className="p-3 text-left">Stone Name</th>
            <th className="p-3 text-left">Description</th>
            <th className="p-3 text-left">Product</th>
            <th className="p-3 text-left">Item</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>

        <tbody>
          {data.map((stone, index) => (
            <tr key={stone.id} className="border-t hover:bg-gray-50">
              <td className="p-3">{index + 1}</td>
              <td className="p-3">{stone.name}</td>
              <td className="p-3">{stone.description}</td>
              <td className="p-3">{productName(stone)}</td>
              <td className="p-3">{itemName(stone)}</td>

              <td className="p-3">
                <div className="flex gap-2">
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Pencil
                      size={16}
                      className="text-blue-500"
                      onClick={() => onEdit(stone)}
                    />
                  </button>

                  <button className="p-1 hover:bg-gray-100 rounded">
                    <Trash
                      size={16}
                      className="text-red-500"
                      onClick={() => onDelete(stone.id)}
                    />
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
