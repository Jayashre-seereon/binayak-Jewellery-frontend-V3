import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { notifyError, notifyInfo, notifySuccess } from "@/utils/notify";
import { getActiveStoreId } from "@/store/authStore";
import ConfirmDialog from "../shared/confirm-dialog";

import TransferTable from "./transfer-table";
import TransferForm from "./transfer-form";
import {
  cancelTransfer,
  createTransfer,
  getTransfers,
  receiveTransfer,
  updateTransfer,
} from "./transfer-api";

export default function TransferPage() {
  const [data, setData] = useState([]);
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [editingTransfer, setEditingTransfer] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type: "cancel" | "receive", transfer }
  const activeStoreId = getActiveStoreId();

  const loadData = useCallback(
    () =>
      getTransfers()
        .then(setData)
        .catch((error) => notifyError(error, "Failed to load transfers.")),
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openForm = (transfer) => {
    setEditingTransfer(transfer);
    setFormKey((k) => k + 1);
    setOpen(true);
  };

  const closeForm = () => {
    setOpen(false);
    setEditingTransfer(null);
  };

  const handleSave = async (formData) => {
    try {
      if (editingTransfer) {
        await updateTransfer(editingTransfer.id, formData);
        notifySuccess("Transfer updated successfully.");
      } else {
        await createTransfer(formData);
        notifySuccess("Transfer created successfully.");
      }
      closeForm();
      await loadData();
    } catch (error) {
      notifyError(error, editingTransfer ? "Failed to update transfer." : "Failed to create transfer.");
      throw error;
    }
  };

  const runConfirmed = async () => {
    const { type, transfer } = confirm;
    try {
      if (type === "cancel") {
        await cancelTransfer(transfer.id);
        notifySuccess("Transfer cancelled successfully.");
      } else {
        const received = await receiveTransfer(transfer.id);
        notifySuccess("Transfer received successfully.");
        const relabel = (received?.items || []).filter(
          (row) => row.relabelRequired || row.extraDetails?.relabelRequired
        ).length;
        if (relabel) {
          notifyInfo(`${relabel} piece(s) were given new barcodes in this store — print new labels for them.`);
        }
      }
      await loadData();
      return true;
    } catch (error) {
      notifyError(error, type === "cancel" ? "Failed to cancel transfer." : "Failed to receive transfer.");
      return false;
    }
  };

  const confirmTransfer = confirm?.transfer;
  const pieceCount = confirmTransfer?.items?.length || 0;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Counter Transfer</h1>
        <Button onClick={() => openForm(null)}>Add Transfer</Button>
      </div>

      <TransferTable
        data={data}
        activeStoreId={activeStoreId}
        onEdit={openForm}
        onCancel={(transfer) => setConfirm({ type: "cancel", transfer })}
        onReceive={(transfer) => setConfirm({ type: "receive", transfer })}
      />

      {open ? (
        <TransferForm
          key={formKey}
          open={open}
          setOpen={(value) => (value ? setOpen(true) : closeForm())}
          onSave={handleSave}
          defaultValues={editingTransfer}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(confirm)}
        setOpen={(value) => !value && setConfirm(null)}
        title={confirm?.type === "cancel" ? "Cancel transfer?" : "Receive transfer?"}
        description={
          confirm?.type === "cancel"
            ? `Transfer ${confirmTransfer?.transferNo || ""} will be cancelled and its ${pieceCount} piece(s) returned to available stock.`
            : `Confirm that the ${pieceCount} piece(s) of transfer ${confirmTransfer?.transferNo || ""} have physically arrived in this store.`
        }
        confirmLabel={confirm?.type === "cancel" ? "Cancel transfer" : "Receive"}
        destructive={confirm?.type === "cancel"}
        onConfirm={runConfirmed}
      />
    </div>
  );
}
