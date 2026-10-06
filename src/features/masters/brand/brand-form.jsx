import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const emptyValues = {
  alias: "",
  name: "",
  description: "",
};

export default function BrandForm({ open, setOpen, onSave, defaultValues }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: emptyValues,
  });

  useEffect(() => {
    reset(defaultValues || emptyValues);
  }, [defaultValues, reset]);

  const submit = async (data) => {
    const saved = await onSave(data);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset(emptyValues);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Update Brand" : "Add Brand"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-3">
            <Input placeholder="Brand Name" {...register("name")} />
          <Textarea placeholder="Description" {...register("description")} />

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">{defaultValues ? "Update" : "Save"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}