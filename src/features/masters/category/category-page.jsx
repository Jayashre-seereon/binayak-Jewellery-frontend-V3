import { useEffect,useState } from "react"
import { Button } from "@/components/ui/button"
import { Table } from "lucide-react"
import { Input } from "@/components/ui/input"
import CategoryTable from "./category-table"
import CategoryForm from "./category-form"
import DeleteModal from "../../../utils/DeleteModal"
import { notifyError, notifySuccess } from "@/utils/notify";
import { getCategory,getCategoryById, addCategory, updateCategory, deleteCategory } 
from "@/api/category-api";

export default function CategoryMaster()  {
  const [search, setSearch] = useState("");
  const [category,setCategory] = useState([]);
    const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
const [deleteOpen, setDeleteOpen] = useState(false);
const [deleteId, setDeleteId] = useState(null);
const [deleteName, setDeleteName] = useState("");

  const loadData = async  () => {
       try {
        const data = await getCategory();
        setCategory(Array.isArray(data) ? [...data].reverse() : []);
      } catch (error) {
        notifyError(error, "Failed to load categories.");
      }

  }

  useEffect(()=> {
    loadData();
  },[]);

  
 const handleSave = async (data) => {
  try {
    if (editData?.id) {
      await updateCategory(editData.id, data);
      notifySuccess("Category updated successfully.");
    } else {
      await addCategory(data);
      notifySuccess("Category added successfully.");
    }

    setEditData(null);
    setOpen(false);
    loadData();
  } catch (error) {
    notifyError(error, "Category save failed.");
    return false;
  }
};

  const handleEdit = async (item) => {
  try {
    const category = await getCategoryById(item.id); 
    setEditData(category);                         
    setOpen(true);
  } catch (error) {
    notifyError(error, "Failed to load category details.");
  }
};

  const confirmDelete = async () => {
  if (!deleteId) return;

  try {
    await deleteCategory(deleteId);
    notifySuccess("Category deleted successfully.");
    setDeleteId(null);
    setDeleteName("");
    setDeleteOpen(false);
    loadData();
  } catch (error) {
    notifyError(error, "Failed to delete category.");
  }
};
   const handleDelete = (item) => {
  setDeleteId(item.id);
  setDeleteName(item.name);
  setDeleteOpen(true);
};
 const filteredData = category
  .filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.alias || "").toLowerCase().includes(search.toLowerCase())
  )
  .reverse(); 

    return (
        <div>
            <div className="flex justify-between items-center mb-4 ">
                <h1 className="text-xl font-semibold"> Category Master</h1>
                 </div>
             <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search category..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
          <Button onClick={() => setOpen(true)}>Add New</Button>
         
      </div>
      {/* category table */}
       <CategoryTable
              data={filteredData}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
      {/* form */}
      <CategoryForm open={open} setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}/>

        <DeleteModal
  open={deleteOpen}
  setOpen={setDeleteOpen}
  onConfirm={confirmDelete}
  title="Delete Category"
  description={`Are you sure you want to delete "${deleteName}"?`}
/>
        </div>
    )
  }
   

  
