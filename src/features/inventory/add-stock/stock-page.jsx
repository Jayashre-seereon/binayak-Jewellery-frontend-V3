import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import DeleteModal from "@/utils/DeleteModal";
import ConfirmDialog from "../shared/confirm-dialog";

import StockTable from "./stock-table";
import StockForm from "./stock-form";
import {
  createStock,
  deleteStock,
  getStock,
  getStockById,
  getStockLabelPdf,
  updateStock,
  updateStockStatus,
  getStockLabelsBulkPdf,
} from "../../../api/stock-api";

const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 300;

const openPdf = (blob) => {
  const pdfUrl = window.URL.createObjectURL(blob);
  window.open(pdfUrl, "_blank", "noopener,noreferrer");
  setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 10000);
};

export default function StockPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editData, setEditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [statusChange, setStatusChange] = useState(null); // { row, status }
  const requestId = useRef(0);
  const timer = useRef(null);

  // Only the inventory page is fetched here; purchase options load inside the Add dialog (INV-15).
  const loadData = useCallback((page, searchValue) => {
    const id = ++requestId.current;
    return getStock({ page, limit: ITEMS_PER_PAGE, search: searchValue || undefined })
      .then((result) => {
        if (id !== requestId.current) return;
        setData(result.inventories);
        setPagination(result.pagination || { total: 0, totalPages: 1 });
      })
      .catch((error) => {
        if (id === requestId.current) notifyError(error, "Failed to load inventory.");
      })
      .finally(() => {
        if (id === requestId.current) setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadData(1, "");
    return () => clearTimeout(timer.current);
  }, [loadData]);

  const reload = (page = currentPage) => {
    setLoading(true);
    return loadData(page, search.trim());
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setCurrentPage(1);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLoading(true);
      loadData(1, value.trim());
    }, SEARCH_DEBOUNCE_MS);
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    reload(page);
  };

  const openForm = (inventory) => {
    setEditData(inventory);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const closeForm = (value) => {
    setOpen(value);
    if (!value) setEditData(null);
  };

  const handleCreate = async (purchaseItemIds, { printLabels } = {}) => {
    const created = [];
    const failures = [];
    for (const purchaseItemId of purchaseItemIds) {
      try {
        const inventory = await createStock(purchaseItemId);
        if (inventory?.id) created.push(inventory.id);
      } catch (error) {
        failures.push(error);
      }
    }

    if (created.length) {
      notifySuccess(`${created.length} inventory piece(s) created.`);
    }
    if (failures.length) {
      notifyError(failures[0], `${failures.length} line(s) could not be added to inventory.`);
    }
    if (printLabels && created.length) {
      try {
        openPdf(await getStockLabelsBulkPdf(created));
      } catch (error) {
        notifyError(error, "Pieces were created, but the labels could not be generated.");
      }
    }
    if (created.length) {
      closeForm(false);
      setCurrentPage(1);
      reload(1);
    }
  };

  const handleUpdate = async (payload) => {
    try {
      await updateStock(editData.id, payload);
      notifySuccess("Inventory updated successfully.");
      closeForm(false);
      reload();
    } catch (error) {
      notifyError(error, "Failed to save inventory.");
    }
  };

  const handleEdit = async (row) => {
    try {
      const inventory = await getStockById(row.id);
      openForm(inventory || row);
    } catch (error) {
      notifyError(error, "Failed to load inventory.");
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStock(deleteId);
      notifySuccess("Inventory deleted successfully.");
      setDeleteOpen(false);
      setDeleteId(null);
      setSelectedIds((prev) => prev.filter((x) => x !== deleteId));
      reload();
    } catch (error) {
      notifyError(error, "Failed to delete inventory.");
    }
  };

  const applyStatusChange = async () => {
    const { row, status } = statusChange;
    try {
      await updateStockStatus(row.id, status);
      notifySuccess(`${row.inventoryCode || "Piece"} marked ${status}.`);
      reload();
      return true;
    } catch (error) {
      notifyError(error, "Failed to update inventory status.");
      return false;
    }
  };

  const handlePrintLabel = async (row) => {
    try {
      openPdf(await getStockLabelPdf(row.id));
    } catch (error) {
      notifyError(error, "Failed to generate inventory label.");
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  // Select-all only adds/removes this page's rows; selections on other pages are kept (INV-21).
  const handleToggleSelectAll = (checked) => {
    const pageIds = data.map((row) => row.id);
    setSelectedIds((prev) =>
      checked ? [...new Set([...prev, ...pageIds])] : prev.filter((id) => !pageIds.includes(id))
    );
  };

  const handleBulkPrintLabels = async () => {
    if (!selectedIds.length) {
      notifyInfo("Select at least one inventory item first.");
      return;
    }
    try {
      openPdf(await getStockLabelsBulkPdf(selectedIds));
    } catch (error) {
      notifyError(error, "Failed to generate bulk inventory labels.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Tag from Purchase</h1>
        </div>
        <div className="flex gap-2">
          {selectedIds.length ? (
            <Button variant="ghost" onClick={() => setSelectedIds([])}>
              Clear selection
            </Button>
          ) : null}
          <Button variant="outline" onClick={handleBulkPrintLabels} disabled={!selectedIds.length}>
            Print Barcode ({selectedIds.length})
          </Button>
          <Button onClick={() => openForm(null)}>Add Inventory</Button>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-3">
        <Input
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search barcode, tag, HUID, item, product..."
          className="w-80"
        />
        {loading ? <span className="text-sm text-gray-500">Loading inventory...</span> : null}
      </div>

      <StockTable
        data={data}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onStatusChange={(row, status) => setStatusChange({ row, status })}
        onPrintLabel={handlePrintLabel}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
      />
      <div className="mt-4 flex items-center justify-between text-sm">
        <span>
          Showing {data.length} of {pagination.total || 0} inventory records
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={currentPage <= 1 || loading} onClick={() => goToPage(currentPage - 1)}>
            Previous
          </Button>
          <span>
            Page {currentPage} of {pagination.totalPages || 1}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= (pagination.totalPages || 1) || loading}
            onClick={() => goToPage(currentPage + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {open ? (
        <StockForm
          key={formKey}
          open={open}
          setOpen={closeForm}
          onCreate={handleCreate}
          onUpdate={handleUpdate}
          defaultValues={editData}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(statusChange)}
        setOpen={(value) => !value && setStatusChange(null)}
        title="Change status?"
        description={
          statusChange
            ? `Change ${statusChange.row.inventoryCode || "this piece"} from ${statusChange.row.status || "AVAILABLE"} to ${statusChange.status}.`
            : ""
        }
        confirmLabel={statusChange ? `Mark ${statusChange.status}` : "Confirm"}
        destructive={statusChange?.status === "MELTED" || statusChange?.status === "DAMAGED"}
        onConfirm={applyStatusChange}
      />

      <DeleteModal
        open={deleteOpen}
        setOpen={setDeleteOpen}
        onConfirm={confirmDelete}
        title="Delete Inventory"
        description="Are you sure you want to delete this inventory record?"
      />
    </div>
  );
}
