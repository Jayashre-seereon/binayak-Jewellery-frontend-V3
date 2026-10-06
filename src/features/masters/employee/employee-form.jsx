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
import { makeEmailRules, makePhoneRules, makeNumericRules, onlyDigits } from "@/utils/validation";

const FieldError = ({ message }) =>
  message ? <p className="text-xs text-red-500 mt-1">{message}</p> : null;

export default function EmployeeForm({ open, setOpen, onSave, defaultValues }) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    mode: "onChange", // validate as the user types/tabs, not just on submit
    defaultValues: {
      name: "",
      fatherName: "",
      dateOfJoining: "",
      phone: "",
      mobile: "",
      email: "",
      webAddress: "",
      bankAccountNo: "",
      bankName: "",
      basicSalary: "",
      specialAllowance: "",
      addressLine1: "",
      addressLine2: "",
    },
  });

 useEffect(() => {
  if (open) {
    reset({
      name: defaultValues?.name || "",
      fatherName: defaultValues?.fatherName || "",

      dateOfJoining: defaultValues?.dateOfJoining
        ? defaultValues.dateOfJoining.split("T")[0]
        : "",

      phone: defaultValues?.phone || "",
      mobile: defaultValues?.mobile || "",
      email: defaultValues?.email || "",
      webAddress: defaultValues?.webAddress || "",

      bankAccountNo: defaultValues?.bankAccountNo || "",
      bankName: defaultValues?.bankName || "",

      basicSalary: defaultValues?.basicSalary ?? "",
      specialAllowance: defaultValues?.specialAllowance ?? "",

      addressLine1: defaultValues?.addressLine1 || "",
      addressLine2: defaultValues?.addressLine2 || "",
    });
  }
}, [open, defaultValues, reset]);

  const submit = async (data) => {
    const saved = await onSave(data);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
    setOpen(false);
  };


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {defaultValues ? "Edit Employee" : "Employee Master"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col h-full">
          <div className="overflow-y-auto pr-2 space-y-4 max-h-[70vh] ">
            <div className="grid grid-cols-2 gap-4">
              {defaultValues?.empCode && (
                <div>
                  <label className="text-sm">Employee Code</label>
                  <Input className="h-9" value={defaultValues.empCode} disabled />
                </div>
              )}

              <div>
                <label className="text-sm">Employee Name</label>
                <Input
                  className="h-9"
                  {...register("name", { required: "Employee Name is required" })}
                />
                <FieldError message={errors.name?.message} />
              </div>

              <div>
                <label className="text-sm">Father Name</label>
                <Input className="h-9" {...register("fatherName")} />
              </div>

              <div>
                <label className="text-sm">Date of Joining</label>
                <Input type="date" className="h-9" {...register("dateOfJoining")} />
              </div>

             <div>
  <label className="text-sm">Phone</label>
              <Input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className="h-9"
                {...register("phone", makePhoneRules("Phone"))}
  />
  <FieldError message={errors.phone?.message} />
</div>

<div>
  <label className="text-sm">Mobile</label>
  <Input
    type="tel"
    inputMode="numeric"
    maxLength={10}
    className="h-9"
    {...register("mobile", makePhoneRules("Mobile"))}
  />
  <FieldError message={errors.mobile?.message} />
</div>

              <div>
                <label className="text-sm">Email</label>
                <Input
                  type="email"
                  className="h-9"
                {...register("email", makeEmailRules("Email"))}
                />
                <FieldError message={errors.email?.message} />
              </div>

              <div>
                <label className="text-sm">Web Address</label>
                <Input className="h-9" {...register("webAddress")} />
              </div>

              <div>
                 <div>
  <label className="text-sm">Bank Account Number</label>
  <Input
    type="text"
    inputMode="numeric"
    className="h-9"
    {...register("bankAccountNo", {
      onChange: (e) => {
        e.target.value = onlyDigits(e.target.value);
      },
    })}
  />
</div>  </div>

              <div>
                <label className="text-sm">Bank Name</label>
                <Input className="h-9" {...register("bankName")} />
              </div>

              <div>
                <label className="text-sm">Basic Salary</label>
                <Input
                  type="number"
                  className="h-9"
                  {...register("basicSalary", makeNumericRules({ label: "Basic Salary", required: true, integerOnly: false }))}
                />
                <FieldError message={errors.basicSalary?.message} />
              </div>

              <div>
                <label className="text-sm">Special Allowance</label>
                <Input
                  type="number"
                  className="h-9"
                  {...register("specialAllowance")}
                />
              </div>

              <div className="col-span-2">
                <label className="text-sm">Address Line 1</label>
                <Input className="h-9" {...register("addressLine1")} />
              </div>

              <div className="col-span-2">
                <label className="text-sm">Address Line 2</label>
                <Input className="h-9" {...register("addressLine2")} />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
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
