import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function MetalForm({
  open,
  setOpen,
  onSave,
  defaultValues,
}) {
  const { register, handleSubmit, reset } = useForm();

  // ✅ IMPORTANT FIX
  useEffect(() => {
    reset(defaultValues || {});
  }, [defaultValues, reset]);

  const submit = async (data) => {
    const saved = await onSave(data);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit Metal" : "Add Metal"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-3">
        
          <Input placeholder="Metal Name" {...register("name")} />
          <Textarea placeholder="Description" {...register("description")} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {defaultValues ? "Update" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}