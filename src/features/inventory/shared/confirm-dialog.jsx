import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/**
 * Confirmation dialog. With `requireReason` the user must type a reason, which is
 * passed to `onConfirm(reason)`. The dialog closes only when onConfirm resolves
 * without throwing / returning false.
 */
export default function ConfirmDialog({
  open,
  setOpen,
  title,
  description,
  confirmLabel = "Confirm",
  destructive = false,
  requireReason = false,
  reasonLabel = "Reason",
  onConfirm,
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const close = (value) => {
    if (busy) return;
    setOpen(value);
    if (!value) setReason("");
  };

  const confirm = async () => {
    if (requireReason && !reason.trim()) return;
    setBusy(true);
    try {
      const result = await onConfirm?.(reason.trim());
      if (result !== false) {
        setOpen(false);
        setReason("");
      }
    } catch {
      // the caller already reported the error; keep the dialog open
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        {requireReason ? (
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700">
              {reasonLabel} <span className="text-destructive">*</span>
            </label>
            <Textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this being cancelled?"
              autoFocus
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-2 mt-2">
          <Button variant="outline" onClick={() => close(false)} disabled={busy}>
            Back
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            onClick={confirm}
            disabled={busy || (requireReason && !reason.trim())}
          >
            {busy ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
