import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import RateTable from "./rate-table";
import RateForm from "./rate-form";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";

import {
  getRates,
  getRateById,
  addRate,
  updateRate,
  deleteRate,
} from "@/api/rate-api";

import { getMetals } from "@/api/metal-api";

export default function RatePage() {
  const [rates, setRates] = useState([]);
  const [metals, setMetals] = useState([]);
  const [search, setSearch] = useState("");

  const [open, setOpen] = useState(false);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");

  const unwrapList = (payload, key) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload)) return payload;
    return [];
  };

  const unwrapItem = (payload) => {
    if (payload?.data && !Array.isArray(payload.data)) return payload.data;
    if (payload?.rate) return payload.rate;
    if (payload && !Array.isArray(payload)) return payload;
    return null;
  };

  const loadData = async () => {
    try {
      const [rateData, metalData] = await Promise.all([getRates(), getMetals()]);
      const rateList = unwrapList(rateData, "rates");
      setRates(Array.isArray(rateList) ? [...rateList].reverse() : []);
      setMetals(unwrapList(metalData, "metals"));
    } catch (error) {
      notifyError(error, "Failed to load rates.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (formData) => {
    try {
      const payload = {
        metalId: formData.metalId ? Number(formData.metalId) : null,
        purityId: formData.purityId ? Number(formData.purityId) : null,
        gradeId: formData.gradeId ? Number(formData.gradeId) : null,
        unit: formData.unit,
        saleRate: formData.saleRate ? Number(formData.saleRate) : 0,
        exchangeRate: formData.exchangeRate ? Number(formData.exchangeRate) : 0,
        cashRate: formData.cashRate ? Number(formData.cashRate) : 0,
      };

      if (editData) {
        await updateRate(editData.id, payload);
        notifySuccess("Rate updated successfully.");
      } else {
        await addRate(payload);
        notifySuccess("Rate added successfully.");
      }
      setEditData(null);
      setOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Rate save failed.");
    }
  };

  const handleEdit = async (item) => {
    try {
      const rate = unwrapItem(await getRateById(item.id));
      setEditData(rate);
      setOpen(true);
    } catch (error) {
      notifyError(error, "Failed to load rate details.");
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = rates.find((item) => item.id === id);
    setDeleteName(selected?.metal?.name || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteRate(deleteId);
      notifySuccess("Rate deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      loadData();
    } catch (error) {
      notifyError(error, "Failed to delete rate.");
    }
  };

  const filteredRates = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rates;

    return rates.filter((rate) =>
      [
        rate.metal?.name,
        rate.purity?.name,
        rate.grade?.name,
        rate.unit,
        rate.saleRate,
        rate.exchangeRate,
        rate.cashRate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rates, search]);

  return (
    <div>
       <div className="flex justify-between mb-4">  <div>
          <h1 className="text-xl font-semibold">Rate Master</h1>
            </div>
        <Button
          onClick={() => {
            setEditData(null);
            setOpen(true);
          }}
        >
          Add Rate
        </Button>
      </div>

      <div className="mb-3 flex justify-between">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by metal, purity, ..."
          className="w-64 "
        />
      </div>

      <RateTable data={filteredRates} onEdit={handleEdit} onDelete={handleDelete} />

      <RateForm
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
        title="Delete Rate"
        description={`Are you sure you want to delete the rate for "${deleteName}"?`}
      />
    </div>
  );
}
