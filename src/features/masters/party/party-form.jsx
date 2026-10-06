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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { makePhoneRules } from "@/utils/validation";

export default function PartyForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  partyTypes,
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {},
  });

  const selectedTypeId = watch("partytypeId");

  useEffect(() => {
    if (open) {
      reset(
        defaultValues
          ? { ...defaultValues, partytypeId: defaultValues.partytypeId ?? defaultValues.partytype?.id }
          : {  name: "", ledger: "", gst: "", phone: "", address: "", partytypeId: "" }
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
          <DialogTitle>Party Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col h-full">

          {/* Scrollable */}
          <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[65vh] pr-2">

          

            <div>
              <label className="text-sm">Party Name</label>
              <Input className="h-9" {...register("name")} />
            </div>

            <div>
              <label className="text-sm">Party Type</label>
              <Select
                value={selectedTypeId ? String(selectedTypeId) : ""}
                onValueChange={(val) => setValue("partytypeId", val)}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select Party Type" />
                </SelectTrigger>
                <SelectContent>
                  {partyTypes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm">Linked Ledger</label>
              <Input className="h-9" {...register("ledger")} />
            </div>

            <div>
              <label className="text-sm">GST Number</label>
              <Input className="h-9" {...register("gst")} />
            </div>

            <div>
              <label className="text-sm">Phone</label>
              <Input
                type="tel"
                inputMode="numeric"
                className="h-9"
                {...register("phone", makePhoneRules("Phone"))}
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm">Address</label>
              <Input className="h-9" {...register("address")} />
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
