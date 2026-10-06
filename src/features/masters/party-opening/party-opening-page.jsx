import { getActiveStoreId } from "@/store/authStore";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import PartyOpeningTable from "./party-opening-table";
import PartyOpeningForm from "./party-opening-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";
import {
  getOpenings,
  getOpeningById,
  addOpening,
  updateOpening,
  deleteOpening,
} from "../../../api/party-opening-api";
import { getParties } from "@/api/party-api";
import { getMetals } from "@/api/metal-api";

// TODO: replace with your actual store context / auth value

export default function PartyOpeningPage() {
  const [openings, setOpenings] = useState([]);
  const [parties, setParties] = useState([]);
  const [metals, setMetals] = useState([]);

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const unwrapList = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.openings)) return payload.openings;
    if (Array.isArray(payload?.partyopeningbalances)) return payload.partyopeningbalances;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapItem = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.opening) return payload.opening;
    if (payload?.partyopeningbalance) return payload.partyopeningbalance;
    if (payload && !Array.isArray(payload)) return payload;
    return null;
  };

  const unwrapParties = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.parties)) return payload.parties;
    if (Array.isArray(payload?.partymasters)) return payload.partymasters;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapMetals = (payload) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.metals)) return payload.metals;
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const loadData = async () => {
    try {
      const [openingData, partyData, metalData] = await Promise.all([
        getOpenings(),
        getParties(),
        getMetals(),
      ]);
      setOpenings(
        Array.isArray(unwrapList(openingData))
          ? [...unwrapList(openingData)].reverse()
          : []
      );
      setParties(unwrapParties(partyData));
      setMetals(unwrapMetals(metalData));
    } catch (error) {
      notifyError(error, "Failed to load party opening balances.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (formData) => {
    try {
      // Whitelist only real PartyOpeningBalance columns — never forward
      // id, createdAt, updatedAt, or nested partymaster/metal objects.
      const payload = {
        partymasterId: formData.partymasterId ? Number(formData.partymasterId) : null,
        metalId: formData.metalId ? Number(formData.metalId) : null,
        type: formData.type,
        year: formData.year,
        debit: formData.debit ? Number(formData.debit) : 0,
        credit: formData.credit ? Number(formData.credit) : 0,
      };

      if (editData) {
        await updateOpening(editData.id, payload);
        notifySuccess("Opening balance updated successfully.");
      } else {
        await addOpening({ ...payload, storeId: getActiveStoreId() });
        notifySuccess("Opening balance added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Opening balance save failed.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const opening = unwrapItem(await getOpeningById(item.id));
      setEditData(opening);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load opening balance details.");
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = openings.find((item) => item.id === id);
    setDeleteName(selected?.partymaster?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteOpening(deleteId);
      notifySuccess("Opening balance deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete opening balance.");
    }
  };

  const filteredData = openings.filter((item) =>
    item.partymaster?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-semibold">Party Opening Balance</h1>
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
          Add Opening
        </Button>
      </div>

      <PartyOpeningTable
        data={filteredData}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <PartyOpeningForm
        open={open}
        setOpen={setOpen}
        onSave={handleSave}
        defaultValues={editData}
        parties={parties}
        metals={metals}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Opening Balance"
        description={`Are you sure you want to delete the opening balance for "${deleteName}"?`}
      />
    </div>
  );
}