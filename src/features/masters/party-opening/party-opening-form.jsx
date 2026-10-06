import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PartyOpeningForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  parties,
  metals,
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {},
  });

  const selectedPartyId = watch("partymasterId");
  const selectedMetalId = watch("metalId");
  const selectedType = watch("type");

  useEffect(() => {
    if (open) {
      reset(
        defaultValues
          ? {
              ...defaultValues,
              partymasterId: defaultValues.partymasterId ?? defaultValues.partymaster?.id,
              metalId: defaultValues.metalId ?? defaultValues.metal?.id,
            }
          : {
              partymasterId: "",
              metalId: "",
              type: "",
              year: "",
              debit: "",
              credit: "",
            }
      );
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
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Party Opening Balance</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col h-full">

          <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[65vh] pr-2">

            {/* Party */}
            <div>
              <label className="text-sm">Party</label>
              <Select
                value={selectedPartyId ? String(selectedPartyId) : ""}
                onValueChange={(val) => setValue("partymasterId", val)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select Party" />
                </SelectTrigger>
                <SelectContent>
                  {parties.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Metal */}
            <div>
              <label className="text-sm">Metal</label>
              <Select
                value={selectedMetalId ? String(selectedMetalId) : ""}
                onValueChange={(val) => setValue("metalId", val)}
              >
                <SelectTrigger className="w-full h-9">
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
            </div>

            {/* Type */}
            <div>
              <label className="text-sm">Opening Type</label>
              <Select
                value={selectedType || ""}
                onValueChange={(val) => setValue("type", val)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Debit / Credit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="debit">Debit</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Financial Year */}
            <div>
              <label className="text-sm">Financial Year</label>
              <Input className="h-9" {...register("year")} />
            </div>

            {/* Debit */}
            <div>
              <label className="text-sm">Debit Weight</label>
              <Input type="number" className="h-9" {...register("debit")} />
            </div>

            {/* Credit */}
            <div>
              <label className="text-sm">Credit Weight</label>
              <Input type="number" className="h-9" {...register("credit")} />
            </div>

          </div>

          {/* Footer */}
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