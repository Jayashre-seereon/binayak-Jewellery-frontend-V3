import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { createStore, deleteStore, getStoreById, getStores, updateStore } from "@/api/store-api";
import StoreCard from "@/features/store/store-card";
import StoreForm from "@/features/store/store-form";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

export default function StoreSelectionPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const setSelectedStore = useAuthStore((state) => state.setSelectedStore);
  const selectedStore = useAuthStore((state) => state.selectedStore);
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const role = useAuthStore((state) => state.role);

  const loadStores = async () => {
    setLoading(true);
    try {
      const response = await getStores();
      const data = response.data?.stores || response.data?.data?.stores || [];
      setStores(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load stores.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStores();
  }, []);

  useEffect(() => {
    if (role && role !== "ADMIN") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, role]);

  const handleStoreSelect = (store) => {
    setSelectedStore(store);
    toast.success(`Entered ${store.storeName || store.name || "store"}.`);
    navigate("/dashboard", { replace: false });
  };

  const handleCreate = async (data) => {
    try {
      await createStore(data);
      toast.success("Store created successfully.");
      setFormOpen(false);
      await loadStores();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to create store.");
    }
  };

  const handleUpdate = async (data) => {
    if (!editingStore?.id) return;

    try {
      await updateStore(editingStore.id, data);
      toast.success("Store updated successfully.");
      setEditingStore(null);
      setFormOpen(false);
      await loadStores();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to update store.");
    }
  };

  const handleDelete = async (store) => {
    try {
      await deleteStore(store.id);
      toast.success("Store deleted successfully.");
      await loadStores();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete store.");
    }
  };

  const handleEdit = async (store) => {
    try {
      const response = await getStoreById(store.id);
      const data = response.data?.store || response.data?.data || response.data || store;
      setEditingStore({ ...data, password: "" });
      setFormOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to load store details.");
    }
  };

  const handleSave = async (data) => {
    if (editingStore?.id) {
      await handleUpdate(data);
      return;
    }
    await handleCreate(data);
  };

  const selectedStoreId = selectedStore?.id;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.95),_rgba(241,245,249,1)_45%,_rgba(226,232,240,1)_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="w-full rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.10)] backdrop-blur">
          <div className="mb-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={logo} alt="Binayak Jewellers logo" className="h-full w-full object-contain p-2" />
              </div>
              <div>
                <div className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  Logged in successfully
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
                  Select a store
                </h1>
                <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                  Welcome, {user?.name || user?.email || "Admin"}. Choose a store to continue managing inventory, sales, and accounts.
                </p>
                {selectedStoreId ? (
                  <p className="mt-2 text-xs text-slate-500">Current store ID: {selectedStoreId}</p>
                ) : null}
              </div>
            </div>
            <div className="flex justify-start lg:justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setEditingStore(null);
                  setFormOpen(true);
                }}
                className="rounded-full border-slate-300 bg-white px-5 py-5 shadow-sm hover:bg-slate-50"
              >
                Create Store
              </Button>
            </div>
          </div>

          {loading ? (
            <Card className="border-slate-200/80 bg-white/90 shadow-sm">
              <CardContent className="p-8 text-center text-slate-600">Loading stores...</CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {stores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  onSelect={() => handleStoreSelect(store)}
                  onEdit={() => handleEdit(store)}
                  onDelete={() => handleDelete(store)}
                />
              ))}
            </div>
          )}

          {!loading && stores.length === 0 ? (
            <Card className="mt-4 border-dashed border-slate-300 bg-white/70 shadow-none">
              <CardContent className="p-10 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  0
                </div>
                <p className="text-base font-medium text-slate-800">No stores available</p>
                <p className="mt-1 text-sm text-slate-500">Create your first store to continue.</p>
              </CardContent>
            </Card>
          ) : null}

          <StoreForm
            open={formOpen}
            setOpen={(open) => {
              setFormOpen(open);
              if (!open) setEditingStore(null);
            }}
            onSave={handleSave}
            initialValues={editingStore}
          />
        </div>
      </div>
    </div>
  );
}
