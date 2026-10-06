import { getActiveStoreId } from "@/store/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PartyTypeTable from "./party-type-table";
import PartyTypeForm from "./party-type-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getPartyTypes,
  getPartyTypeById,
  addPartyType,
  updatePartyType,
  deletePartyType,
} from "@/api/party-type-api";

// TODO: replace with your actual store context / auth value

export default function PartyTypePage() {
  const [partyTypes, setPartyTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const unwrapList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.partytypes)) return payload.partytypes;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapItem = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.partytype) return payload.partytype;
    if (payload && !Array.isArray(payload)) return payload;
    return null;
  };

  const loadData = async () => {
    try {
      const partyTypeData = unwrapList(await getPartyTypes());
      setPartyTypes(Array.isArray(partyTypeData) ? [...partyTypeData].reverse() : []);
    } catch (error) {
      notifyError(error, "Failed to load party types.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editData) {
        await updatePartyType(editData.id, data);
        notifySuccess("Party type updated successfully.");
      } else {
        await addPartyType({ ...data, storeId: getActiveStoreId() });
        notifySuccess("Party type added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Party type save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const partyType = unwrapItem(await getPartyTypeById(item.id));
      setEditData(partyType);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load party type details.");
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    const selected = partyTypes.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deletePartyType(deleteId);
      notifySuccess("Party type deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete party type.");
    }
  };

  const filteredData = partyTypes.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Party Type Master</h1>
      </div>

      <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search party type..."
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

      <PartyTypeTable
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PartyTypeForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Party Type"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}