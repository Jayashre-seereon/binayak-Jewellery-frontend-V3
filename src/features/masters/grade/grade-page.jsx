import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import GradeTable from "./grade-table";
import GradeForm from "./grade-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getGrades,
  getGradeById,
  addGrade,
  updateGrade,
  deleteGrade,
} from "@/api/grade-api";
import { getPurities } from "@/api/purity-api";

export default function GradePage() {
  const [grades, setGrades] = useState([]);
  const [purities, setPurities] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const unwrapList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.grades)) return payload.grades;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapItem = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.grade) return payload.grade;
    if (payload && !Array.isArray(payload)) return payload;
    return null;
  };

  const loadData = async () => {
    try {
      const gradeData = unwrapList(await getGrades());
      const purityData = await getPurities();
      setGrades(Array.isArray(gradeData) ? [...gradeData].reverse() : []);
      setPurities(purityData);
    } catch (error) {
      notifyError(error, "Failed to load grades.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateGrade(editData.id, data);
        notifySuccess("Grade updated successfully.");
      } else {
        await addGrade(data);
        notifySuccess("Grade added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Grade save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const grade = unwrapItem(await getGradeById(item.id));
      setEditData(grade);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load grade details.");
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    const selected = grades.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteGrade(deleteId);
      notifySuccess("Grade deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete grade.");
    }
  };

  const filteredData = grades.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Grade Master</h1>
        </div>

      <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search grade..."
          className="w-64"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Button onClick={() => setOpen(true)}>Add New</Button>
      
      </div>

      <GradeTable
        data={filteredData}
        purities={purities}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <GradeForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        purities={purities}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Grade"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
