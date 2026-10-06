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

export default function GradeForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  purities,
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      name: "",
      purityId: "",
      percentage: "",
      description: "",
    },
  });

  useEffect(() => {
    if (open) {
      const resolvedPurityId =
        defaultValues?.purityId ||
        defaultValues?.purity?.id ||
        defaultValues?.purity?.purityId ||
        "";

      reset({
        name: defaultValues?.name || "",
        purityId: resolvedPurityId ? String(resolvedPurityId) : "",
        percentage:
          defaultValues?.percentage !== undefined &&
          defaultValues?.percentage !== null
            ? String(defaultValues.percentage)
            : "",
        description: defaultValues?.description || "",
      });
    }
  }, [defaultValues, open, reset]);

  const submit = async (data) => {
    const saved = await onSave({
      ...data,
      purityId: data.purityId ? Number(data.purityId) : null,
      name: String(data.name || "").trim(),
      percentage: Number.parseFloat(data.percentage),
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
          <DialogTitle>Grade Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label className="text-sm">Grade Name</label>
            <Input
              className="h-9"
              aria-invalid={Boolean(errors.name)}
              {...register("name", {
                required: "Grade name is required",
                validate: (value) => String(value || "").trim().length > 0 || "Grade name is required",
              })}
            />
            {errors.name ? <p className="text-xs text-red-500">{errors.name.message}</p> : null}
          </div>

          <div>
            <label className="text-sm">Purity</label>
            <Controller
              name="purityId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full h-9">
                    <SelectValue placeholder="Select Purity" />
                  </SelectTrigger>
                  <SelectContent>
                    {purities.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div>
            <label className="text-sm">Percentage</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              max="100"
              className="h-9"
              aria-invalid={Boolean(errors.percentage)}
              {...register("percentage", {
                required: "Percentage is required",
                validate: (value) => {
                  const pct = Number.parseFloat(value);
                  if (!Number.isFinite(pct)) return "Enter a valid percentage";
                  if (pct <= 0 || pct > 100) return "Percentage must be greater than 0 and at most 100";
                  return true;
                },
              })}
            />
            {errors.percentage ? (
              <p className="text-xs text-red-500">{errors.percentage.message}</p>
            ) : null}
          </div>

          <div>
            <label className="text-sm">Description</label>
            <Textarea rows={3} {...register("description")} />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
