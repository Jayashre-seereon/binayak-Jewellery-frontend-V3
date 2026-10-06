import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeleteModal from "../../../utils/DeleteModal";
import { notifyError, notifySuccess } from "@/utils/notify";

import OldPurchaseTable from "./old-purchase-table";
import OldPurchaseForm from "./old-purchase-form";
import PurchaseInvoicePreviewModal from "./purchase-invoice-preview-modal";

import {
  PURCHASE_TYPES,
  getOldPurchases,
  getOldPurchaseById,
  addOldPurchase,
  updateOldPurchase,
  deleteOldPurchase,
  getPurchasePdf,
} from "../../../api/old-purchase-api";

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

export default function OldPurchasePage() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editData, setEditData] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteName, setDeleteName] = useState("");
  const [previewPurchase, setPreviewPurchase] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const requestId = useRef(0);
  const debounceTimer = useRef(null);

  // Out-of-order responses (slow "AB" after fast "ABC") are dropped.
  const loadData = useCallback(async ({ page, searchValue, type }) => {
    const id = ++requestId.current;
    setLoading(true);
    try {
      const result = await getOldPurchases({
        page,
        limit: ITEMS_PER_PAGE,
        search: searchValue || undefined,
        purchaseType: type,
      });
      if (id !== requestId.current) return;
      setData(result.purchases);
      setPagination(result.pagination);
    } catch (error) {
      if (id === requestId.current) notifyError(error, "Failed to load purchases.");
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, []);

  const reload = (overrides = {}) =>
    loadData({ page: currentPage, searchValue: search, type: typeFilter, ...overrides });

  useEffect(() => {
    loadData({ page: 1, searchValue: "", type: "ALL" });
    return () => clearTimeout(debounceTimer.current);
  }, [loadData]);

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      loadData({ page: 1, searchValue: value.trim(), type: typeFilter });
    }, SEARCH_DEBOUNCE_MS);
  };

  const handleTypeChange = (type) => {
    setTypeFilter(type);
    setCurrentPage(1);
    loadData({ page: 1, searchValue: search.trim(), type });
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    reload({ page });
  };

  const openForm = (purchase) => {
    setEditData(purchase);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const closeForm = (value) => {
    setOpen(value);
    if (!value) setEditData(null);
  };

  /** Resolves true when saved; the form stays open (with its data) on failure. */
  const handleSave = async (formData) => {
    try {
      if (editData?.id) {
        await updateOldPurchase(editData.id, formData);
        notifySuccess("Purchase updated successfully.");
      } else {
        await addOldPurchase(formData);
        notifySuccess("Purchase added successfully.");
      }
      closeForm(false);
      reload();
      return true;
    } catch (error) {
      notifyError(error, "Failed to save purchase.");
      return false;
    }
  };

  const handleEdit = async (item) => {
    try {
      const purchase = await getOldPurchaseById(item.id);
      openForm(purchase || item);
    } catch (error) {
      notifyError(error, "Failed to load purchase details.");
    }
  };

  const handlePreview = async (item) => {
    try {
      const purchase = await getOldPurchaseById(item.id);
      setPreviewPurchase(purchase || item);
    } catch {
      setPreviewPurchase(item);
    }
    setPreviewOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    const selected = data.find((item) => item.id === id);
    setDeleteName(selected?.invoiceNo || selected?.customerName || `#${id}`);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteOldPurchase(deleteId);
      notifySuccess("Purchase deleted successfully.");
      setDeleteId(null);
      setDeleteName("");
      setDeleteOpen(false);
      reload();
    } catch (error) {
      notifyError(error, "Failed to delete purchase.");
    }
  };

  const handleDownload = async (id) => {
    try {
      const blob = await getPurchasePdf(id);
      const pdfUrl = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      window.open(pdfUrl, "_blank");
      setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 60000);
    } catch (error) {
      notifyError(error, "Failed to open purchase PDF.");
    }
  };

  return (
    <div>
      <div className="flex justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold">Purchase</h1>
        </div>
        <Button onClick={() => openForm(null)}>Add Purchase</Button>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search invoice no, customer, phone..."
          className="w-72"
        />
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={typeFilter}
          onChange={(e) => handleTypeChange(e.target.value)}
        >
          <option value="ALL">All types</option>
          {PURCHASE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        {loading ? <span className="text-xs text-muted-foreground">Loading...</span> : null}
      </div>

      <OldPurchaseTable
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onDownload={handleDownload}
        onPreview={handlePreview}
      />
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>
          Showing {data.length} of {pagination.total || 0} purchases
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={currentPage <= 1} onClick={() => goToPage(currentPage - 1)}>
            Previous
          </Button>
          <span>
            Page {currentPage} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= (pagination.totalPages || 1)}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {open ? (
        <OldPurchaseForm
          key={formKey}
          open={open}
          setOpen={closeForm}
          onSave={handleSave}
          defaultValues={editData}
        />
      ) : null}

      <PurchaseInvoicePreviewModal
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        purchase={previewPurchase}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Purchase"
        description={`Are you sure you want to delete "${deleteName}"?`}
      />
    </div>
  );
}
