import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import StoreForm from "./store-form";
import StoreCard from "./store-card";
import { createStore, deleteStore, getStoreById, getStores, updateStore } from "./../../api/store-api";
import { toast } from "sonner";

export default function StorePage() {
  const [stores, setStores] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);

  const loadData = () =>
    getStores()
      .then((response) => {
        const data = response.data?.stores || response.data?.data?.stores || [];
        setStores(Array.isArray(data) ? data : []);
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || "Failed to load stores.");
      });

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (data) => {
    try {
      if (editingStore?.id) {
        await updateStore(editingStore.id, data);
        toast.success("Store updated successfully.");
      } else {
        await createStore(data);
        toast.success("Store created successfully.");
      }
      setEditingStore(null);
      setOpen(false);
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Store save failed.");
    }
  };

  const handleEdit = async (store) => {
    try {
      const response = await getStoreById(store.id);
      const data = response.data?.store || response.data?.data || response.data || store;
      setEditingStore({ ...data, password: "" });
      setOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load store details.");
    }
  };

  const handleDelete = async (store) => {
    try {
      await deleteStore(store.id);
      toast.success("Store deleted successfully.");
      await loadData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete store.");
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <h1 className="text-xl font-semibold">Stores</h1>
        <Button
          onClick={() => {
            setEditingStore(null);
            setOpen(true);
          }}
        >
          Add Store
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {stores.map((store) => (
          <StoreCard
            key={store.id}
            store={store}
            onEdit={() => handleEdit(store)}
            onDelete={() => handleDelete(store)}
          />
        ))}
      </div>

      <StoreForm
        open={open}
        setOpen={(value) => {
          setOpen(value);
          if (!value) setEditingStore(null);
        }}
        onSave={handleSave}
        initialValues={editingStore}
      />
    </div>
  );
}
