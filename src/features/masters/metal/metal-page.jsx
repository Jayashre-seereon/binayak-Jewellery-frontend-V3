import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MetalTable from "./metal-table";
import MetalForm from "./metal-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getMetals,
  getMetalById,
  addMetal,
  updateMetal,
  deleteMetal,
} from "@/api/metal-api";

export default function MetalPage() {
  const [metals, setMetals] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
const [deleteId, setDeleteId] = useState(null);
const [deleteName, setDeleteName] = useState("");
  const loadData = async () => {
    try {
      const data = await getMetals();
      setMetals(Array.isArray(data) ? [...data].reverse() : []);
    } catch (error) {
      notifyError(error, "Failed to load metals.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateMetal(editData.id, data);
        notifySuccess("Metal updated successfully.");
      } else {
        await addMetal(data);
        notifySuccess("Metal added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Metal save failed.");
      return false;
    }
  };

 const handleEdit = async (item) => {
  try {
    const metal = await getMetalById(item.id); 
    setEditData(metal);                        
    setOpen(true);                            
  } catch (error) {
    notifyError(error, "Failed to load metal details.");
  }
};

const handleDelete = (item) => {
  setDeleteId(item.id);
  setDeleteName(item.name);
  setDeleteOpen(true);
};
const confirmDelete = async () => {
  if (!deleteId) return;

  try {
    await deleteMetal(deleteId);
    notifySuccess("Metal deleted successfully.");
    setDeleteId(null);
    setDeleteName("");
    setDeleteOpen(false);
    loadData();
  } catch (error) {
    notifyError(error, "Failed to delete metal.");
  }
};
  const filteredData = metals.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) 
    
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Metal Master</h1>
        </div>

      <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search metal..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
         <Button onClick={() => setOpen(true)}>Add New</Button>
     
      </div>

      <MetalTable
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <MetalForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
      />
      <DeleteModal
  open={deleteOpen}
  setOpen={setDeleteOpen}
  onConfirm={confirmDelete}
  title="Delete Metal"
  description={`Are you sure you want to delete "${deleteName}"?`}
/>
    </div>
  );
}
