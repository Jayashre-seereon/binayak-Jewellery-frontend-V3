import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PurityTable from "./purity-table";
import PurityForm from "./purity-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getPurities,
  getPurityById,
  addPurity,
  updatePurity,
  deletePurity,
} from "@/api/purity-api";
import { getMetals } from "@/api/metal-api";

export default function PurityPage() {
  const [purities, setPurities] = useState([]);
  const [metals, setMetals] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

 const loadData = async () => {
  try {
    const purityData = await getPurities();
    setPurities(Array.isArray(purityData) ? [...purityData].reverse() : []);

    const metalData = await getMetals();
    setMetals(metalData);
  } catch (error) {
    notifyError(error, "Failed to load purities.");
  }
};

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updatePurity(editData.id, data);
        notifySuccess("Purity updated successfully.");
      } else {
        await addPurity(data);
        notifySuccess("Purity added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Purity save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const purity = await getPurityById(item.id);
      setEditData(purity);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load purity details.");
    }
  };

  const handleDelete = (item) => {
    setDeleteId(item.id);
    setDeleteName(item.name || `#${item.id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePurity(deleteId);
      notifySuccess("Purity deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete purity.");
    }
  };

  const filteredData = purities.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Purity Master</h1>
         </div>

      <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search purity..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
         <Button onClick={() => setOpen(true)}>Add New</Button>
     
      </div>

      <PurityTable
        data={filteredData}
        metals={metals}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PurityForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        metals={metals}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Purity"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
