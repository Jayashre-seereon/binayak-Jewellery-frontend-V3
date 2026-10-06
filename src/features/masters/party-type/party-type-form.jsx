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

export default function PartyTypeForm({ open, setOpen, onSave, defaultValues }) {
  const { register, handleSubmit, reset } = useForm({ defaultValues: {} });

  useEffect(() => {
    if (open) {
      reset(defaultValues || { name: "", description: "" });
    }
  }, [open, defaultValues, reset]);

  const submit = async (data) => {
    const saved = await onSave(data);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Party Type Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col h-full">
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
            <div>
              <label className="text-sm">Party Type Name</label>
              <Input className="h-9" {...register("name")} />
            </div>

            <div>
              <label className="text-sm">Description</label>
              <Textarea rows={3} {...register("description")} />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}