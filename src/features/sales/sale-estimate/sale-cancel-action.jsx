import { useState } from "react";
import { Popconfirm, Input } from "antd";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { notifyError, notifySuccess } from "@/utils/notify";
import { cancelSale } from "./sale-estimate-api";

const MIN_REASON = 5;

/** "Cancel Invoice" with a mandatory reason. The server restores stock, advances, old gold and the ledger. */
export default function SaleCancelAction({ sale, onCancelled, variant = "icon" }) {
  const [reason, setReason] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!sale || sale.status === "CANCELLED") return null;

  const trimmed = reason.trim();
  const valid = trimmed.length >= MIN_REASON;

  const confirm = async () => {
    if (!valid) return;
    try {
      setBusy(true);
      const updated = await cancelSale(sale.id, trimmed);
      notifySuccess(`Invoice ${sale.invoiceNo} cancelled. Stock and adjustments were restored.`);
      setOpen(false);
      setReason("");
      onCancelled?.(updated || { ...sale, status: "CANCELLED", cancelledReason: trimmed });
    } catch (error) {
      notifyError(error, "Unable to cancel this invoice.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popconfirm
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) setReason("");
      }}
      placement="left"
      title={`Cancel invoice ${sale.invoiceNo}?`}
      description={
        <div className="w-72 space-y-1.5 pt-1" data-scanner-ignore>
          <p className="text-xs text-slate-600">
            Pieces go back to AVAILABLE, advance / old-gold adjustments are restored and the sale journal is
            reversed. This cannot be undone.
          </p>
          <Input.TextArea
            autoFocus
            rows={3}
            maxLength={500}
            placeholder="Reason for cancellation (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          {!valid && trimmed.length > 0 && (
            <p className="text-[11px] text-red-600">Please enter at least {MIN_REASON} characters.</p>
          )}
        </div>
      }
      okText="Cancel invoice"
      cancelText="Keep"
      okButtonProps={{ danger: true, disabled: !valid, loading: busy }}
      onConfirm={confirm}
    >
      {variant === "icon" ? (
        <Button
          variant="ghost"
          size="icon"
          title="Cancel Invoice"
          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
        >
          <Ban className="h-4 w-4" />
        </Button>
      ) : (
        <Button variant="outline" size="sm" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
          <Ban className="h-4 w-4" /> Cancel Invoice
        </Button>
      )}
    </Popconfirm>
  );
}
