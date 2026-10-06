import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function PurityForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  metals,
}) {
  const { register, handleSubmit, reset, control } = useForm({
    defaultValues: {
      name: "",
      metalId: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      const resolvedMetalId =
        defaultValues?.metalId ||
        defaultValues?.metal?.id ||
        defaultValues?.metal?.metalId ||
        "";

      reset({
        name: defaultValues?.name || "",
        metalId: resolvedMetalId ? String(resolvedMetalId) : "",
        description: defaultValues?.description || "",
      });
    }
  }, [defaultValues, open, reset]);

  const submit = async (data) => {
    const saved = await onSave({
      ...data,
      metalId: data.metalId ? Number(data.metalId) : null,
    });
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Purity Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
  <div>
    <label className="text-sm">Purity Name</label>
    <Input className="w-full" {...register("name")} />
  </div>

  <div>
    <label className="text-sm">Metal</label>
    <Controller
      name="metalId"
      control={control}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select Metal" />
          </SelectTrigger>
          <SelectContent>
            {metals.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  </div>

  <div>
    <label className="text-sm">Description</label>
    <Textarea className="w-full" rows={3} {...register("description")} />
  </div>

  <div className="flex justify-end gap-2">
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
