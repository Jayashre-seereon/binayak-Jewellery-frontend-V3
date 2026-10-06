import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { resetStorePassword } from "@/api/store-api";
import { validateNewPassword } from "@/api/authApi";
import { getApiErrorMessage } from "@/utils/notify";

export default function StorePasswordDialog({ store, open, setOpen }) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { newPassword: "", confirmPassword: "" } });

  const close = (value) => {
    setOpen(value);
    if (!value) reset();
  };

  const submit = async (values) => {
    try {
      const response = await resetStorePassword(store.id, values.newPassword);
      toast.success(
        response.data?.message ||
          "Password reset. The store must change it at next login."
      );
      close(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to reset the store password."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>
            Set a temporary password for {store?.storeName || store?.name}. The store is signed out
            everywhere and must choose its own password at next login.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(submit)} className="space-y-3">
          <div className="space-y-1">
            <div className="relative">
              <Input
                type={visible ? "text" : "password"}
                placeholder="New password"
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={Boolean(errors.newPassword)}
                {...register("newPassword", {
                  required: "New password is required",
                  validate: validateNewPassword,
                })}
              />
              <button
                type="button"
                onClick={() => setVisible((value) => !value)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              >
                {visible ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.newPassword ? (
              <p className="text-xs text-red-500">{errors.newPassword.message}</p>
            ) : null}
          </div>
          <div className="space-y-1">
            <Input
              type={visible ? "text" : "password"}
              placeholder="Confirm new password"
              autoComplete="new-password"
              aria-invalid={Boolean(errors.confirmPassword)}
              {...register("confirmPassword", {
                required: "Please confirm the password",
                validate: (value) => value === getValues("newPassword") || "Passwords do not match",
              })}
            />
            {errors.confirmPassword ? (
              <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
            ) : null}
          </div>
          <p className="text-xs text-slate-500">At least 8 characters, with a letter and a digit.</p>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Reset password"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
