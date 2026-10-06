import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrandTable from "./brand-table";
import BrandForm from "./brand-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import { getBrands, getBrandById, addBrand, updateBrand, deleteBrand } from "../../../api/brand-api";

export default function BrandPage() {
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteName, setDeleteName] = useState("");
  const [deleteId, setDeleteId] = useState(null);

  const loadData = async () => {
    try {
      const data = await getBrands();
      setBrands(Array.isArray(data) ? [...data].reverse() : []);
    } catch (error) {
      notifyError(error, "Failed to load brands.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData?.id) {
        await updateBrand(editData.id, data);
        notifySuccess("Brand updated successfully.");
      } else {
        await addBrand(data);
        notifySuccess("Brand added successfully.");
      }

      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Brand save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const brand = await getBrandById(item.id);
      setEditData(brand);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load brand details.");
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
      await deleteBrand(deleteId);
      notifySuccess("Brand deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete brand.");
    }
  };

  const filteredData = brands
    .filter((item) =>
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.alias || "").toLowerCase().includes(search.toLowerCase())
    )
    .reverse();

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Brand Master</h1>
      </div>

      <div className="mb-3 flex justify-between ">
        <Input
          placeholder="Search brand..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button
          onClick={() => {
            setEditData(null);
            setOpen(true);
          }}
        >
          Add New
        </Button>
      </div>

      <BrandTable
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <BrandForm
        open={open}
        setOpen={(value) => {
          setOpen(value);
          if (!value) setEditData(null);
        }}
        onSave={handleSave}
        defaultValues={editData}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Brand"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
