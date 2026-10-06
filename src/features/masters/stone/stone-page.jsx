import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StoneTable from "./stone-table";
import StoneForm from "./stone-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";

import {
  getStones,
  getStoneById,
  addStone,
  updateStone,
  deleteStone,
} from "@/api/stone-api";

import { getProducts } from "@/api/product-api";

export default function StonePage() {
  const [stones, setStones] = useState([]);
  const [products, setProducts] = useState([]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const loadData = async () => {
    try {
      const stoneData = await getStones();
      const productData = await getProducts();

     setStones(
  Array.isArray(stoneData)
    ? [...stoneData].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )
    : []
);  setProducts(productData);
    } catch (error) {
      notifyError(error, "Failed to load stones.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateStone(editData.id, data);
        notifySuccess("Stone updated successfully.");
      } else {
        await addStone(data);
        notifySuccess("Stone added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Stone save failed.");
      return false;
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = stones.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStone(deleteId);
      notifySuccess("Stone deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete stone.");
    }
  };

  const filteredData = stones.filter((s) =>
    `${s.name || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Stone Master</h1>
       
      </div>
 <div className="mb-3 flex justify-between">
      <Input
        placeholder="Search stone..."
        className="w-64 "
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
       <Button
          onClick={() => {
            setEditData(null);
            setOpen(true);
          }}
        >
          Add Stone
        </Button>
</div>
      <StoneTable
        data={filteredData}
        products={products}
        onEdit={async (item) => {
          try {
            const stone = await getStoneById(item.id);
            setEditData(stone || item);
            setOpen(true);
          } catch (error) {
            notifyError(error, "Failed to load stone details.");
          }
        }}
        onDelete={handleDelete}
      />

      <StoneForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        products={products}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Stone"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
