import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ProductTable from "./product-table";
import ProductForm from "./product-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct,
} from "@/api/product-api";
import { getCategory } from "@/api/category-api";
import { getMetals } from "@/api/metal-api";
import { getPurities } from "@/api/purity-api";
import { getGrades } from "@/api/grade-api";

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [metals, setMetals] = useState([]);
  const [purities, setPurities] = useState([]);
  const [grades, setGrades] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const loadData = async () => {
    try {
      const [productData, categoryData, metalData, purityData, gradeData] = await Promise.all([
        getProducts(),
        getCategory().catch(() => []),
        getMetals().catch(() => []),
        getPurities().catch(() => []),
        getGrades().catch(() => []),
      ]);

      setProducts(Array.isArray(productData) ? [...productData].reverse() : []);
      setCategories(categoryData);
      setMetals(metalData);
      setPurities(Array.isArray(purityData) ? purityData : purityData?.data || []);
      setGrades(Array.isArray(gradeData) ? gradeData : gradeData?.data || []);
    } catch (error) {
      notifyError(error, "Failed to load products.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateProduct(editData.id, data);
        notifySuccess("Product updated successfully.");
      } else {
        await addProduct(data);
        notifySuccess("Product added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Product save failed.");
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = products.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct(deleteId);
      notifySuccess("Product deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete product.");
    }
  };

  const term = search.trim().toLowerCase();
  const filteredData = products.filter((p) =>
    (p.name || "").toLowerCase().includes(term)
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Product Master</h1>
         </div>
<div className="mb-3 flex justify-between">
      <Input
        placeholder="Search product..."
        className="w-64 "
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
 <Button onClick={() => { setEditData(null); setOpen(true); }}>Add Product</Button>
    </div>
      <ProductTable
        data={filteredData}
        onEdit={async (item) => {
          const product = await getProductById(item.id);
          setEditData(product || item);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />

      <ProductForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        categories={categories}
        metals={metals}
        purities={purities}
        grades={grades}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Product"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
