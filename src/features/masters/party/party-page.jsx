import { getActiveStoreId } from "@/store/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PartyTable from "./party-table";
import PartyForm from "./party-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getParties,
  getPartyById,
  addParty,
  updateParty,
  deleteParty,
} from "@/api/party-api";
import { getPartyTypes } from "@/api/party-type-api";

// TODO: replace with your actual store context / auth value

export default function PartyPage() {
  const [parties, setParties] = useState([]);
  const [partyTypes, setPartyTypes] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const unwrapList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.parties)) return payload.parties;
    if (Array.isArray(payload?.partymasters)) return payload.partymasters;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapItem = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.party) return payload.party;
    if (payload?.partymaster) return payload.partymaster;
    if (payload && !Array.isArray(payload)) return payload;
    return null;
  };

  const unwrapPartyTypes = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.partytypes)) return payload.partytypes;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const loadData = async () => {
    try {
      const [partyData, partyTypeData] = await Promise.all([
        getParties(),
        getPartyTypes(),
      ]);
      setParties(
        Array.isArray(unwrapList(partyData))
          ? [...unwrapList(partyData)].reverse()
          : []
      );
      setPartyTypes(unwrapPartyTypes(partyTypeData));
    } catch (error) {
      notifyError(error, "Failed to load parties.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (formData) => {
    try {
      // Whitelist only real Partymaster columns — never forward id,
      // createdAt, updatedAt, or the nested partytype object that
      // getPartyById returns, since Prisma's update() rejects them.
      const payload = {
        name: formData.name,
        gst: formData.gst,
        phone: formData.phone,
        ledger: formData.ledger,
        address: formData.address,
        partytypeId: formData.partytypeId ? Number(formData.partytypeId) : null,
      };
      if (editData) {
        await updateParty(editData.id, payload);
        notifySuccess("Party updated successfully.");
      } else {
        await addParty({ ...payload, storeId: getActiveStoreId() });
        notifySuccess("Party added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Party save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const party = unwrapItem(await getPartyById(item.id));
      setEditData(party);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load party details.");
    }
  };

  const handleDelete = async (id) => {
    setDeleteId(id);
    const selected = parties.find((item) => item.id === id);
    setDeleteName(selected?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteParty(deleteId);
      notifySuccess("Party deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete party.");
    }
  };

  const filteredData = parties.filter((item) =>
    item.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Party Master</h1>
      </div>

      <div className="mb-3 flex justify-between">
        <Input
          placeholder="Search party..."
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
          Add Party
        </Button>
      </div>

      <PartyTable
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PartyForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        partyTypes={partyTypes}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Party"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}