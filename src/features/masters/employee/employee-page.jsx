import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import EmployeeTable from "./employee-table";
import EmployeeForm from "./employee-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";

import {
  getEmployees,
  getEmployeeById,
  addEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/api/employee-api";

export default function EmployeePage() {
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const loadData = async () => {
    try {
      const data = await getEmployees();
      setEmployees(
        Array.isArray(data)
          ? [...data].sort(
              (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
            )
          : []
      );
    } catch (error) {
      notifyError(error, "Failed to load employees.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updateEmployee(editData.id, data);
        notifySuccess("Employee updated successfully.");
      } else {
        await addEmployee(data);
        notifySuccess("Employee added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Employee save failed.");
      return false;
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = employees.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteEmployee(deleteId);
      notifySuccess("Employee deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete employee.");
    }
  };

  const filteredData = employees.filter((e) =>
    `${e.name || ""} ${e.empCode || ""}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Employee Master</h1>
        
      </div>
<div className="mb-3 flex justify-between">
      <Input
        placeholder="Search employee..."
        className="w-64  "
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <Button
          onClick={() => {
            setEditData(null);
            setOpen(true);
          }}
        >
          Add Employee
        </Button>
</div>
      <EmployeeTable
        data={filteredData}
        onEdit={async (item) => {
          try {
            const employee = await getEmployeeById(item.id);
            setEditData(employee || item);
            setOpen(true);
          } catch (error) {
            notifyError(error, "Failed to load employee details.");
          }
        }}
        onDelete={handleDelete}
      />

      <EmployeeForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        className="w-[450px]"
        
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Employee"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}