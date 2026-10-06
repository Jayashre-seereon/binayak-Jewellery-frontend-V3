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
import { useEffect } from "react";
import dayjs from "dayjs";
import { makePhoneRules } from "@/utils/validation";

const today = () => dayjs().format("YYYY-MM-DD");

const toDateInput = (value) => {
  if (!value) return today();
  return String(value).slice(0, 10);
};

export default function AdvanceForm({
  open,
  setOpen,
  onSave,
  defaultValues,
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: {
      customerName: "",
      contactNumber: "",
      address: "",
      amount: "",
      paymentMode: "CASH",
      specification: "",
      date: today(),
    },
  });

  useEffect(() => {
    reset({
      customerName: defaultValues?.customerName || "",
      contactNumber: defaultValues?.contactNumber || "",
      address: defaultValues?.address || "",
      amount: defaultValues?.amount ?? "",
      paymentMode: defaultValues?.paymentMode || "CASH",
      specification: defaultValues?.specification || "",
      date: toDateInput(defaultValues?.date || defaultValues?.receiveDate),
    });
  }, [defaultValues, open, reset]);

  const submit = (data) => {
    onSave({
      ...data,
      date: data.date || today(),
    });
    reset({
      customerName: "",
      contactNumber: "",
      address: "",
      amount: "",
      paymentMode: "CASH",
      specification: "",
      date: today(),
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Advance Receive</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs">Customer Name *</label>
            <Input {...register("customerName", { required: "Customer name is required" })} className="mt-1" />
            {errors.customerName && (
              <p className="mt-1 text-xs text-red-500">{errors.customerName.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs">Contact Number</label>
            <Input
              {...register("contactNumber", makePhoneRules("Contact Number"))}
              className="mt-1"
              maxLength={10}
            />
            {errors.contactNumber && (
              <p className="mt-1 text-xs text-red-500">{errors.contactNumber.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-xs">Address</label>
            <Textarea {...register("address")} className="mt-1" />
          </div>

          <div>
            <label className="text-xs">Amount *</label>
            <Input type="number" step="0.01" min="0.01" {...register("amount", { required: "Amount is required" })} className="mt-1" />
            {errors.amount && (
              <p className="mt-1 text-xs text-red-500">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="text-xs">Payment Mode</label>
            <select {...register("paymentMode")} className="w-full border h-10 rounded mt-1 px-2">
              <option value="CASH">Cash</option>
              <option value="ONLINE">Online</option>
            </select>
          </div>

          <div>
            <label className="text-xs">Date *</label>
            <Input
              type="date"
              {...register("date", { required: "Date is required" })}
              className="mt-1"
            />
            {errors.date && (
              <p className="mt-1 text-xs text-red-500">{errors.date.message}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="text-xs">Specification</label>
            <Textarea {...register("specification")} className="mt-1" />
          </div>

          <div className="col-span-2 flex justify-end gap-2 mt-4">
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
