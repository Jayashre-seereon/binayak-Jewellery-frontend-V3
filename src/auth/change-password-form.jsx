import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { changePasswordApi, validateNewPassword } from "@/api/authApi";
import { useAuthStore } from "@/store/authStore";
import { getApiErrorMessage } from "@/utils/notify";

function PasswordField({ id, label, error, registration, autoComplete }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          className="h-11 border-slate-200 bg-slate-50 px-3 pr-10"
          aria-invalid={Boolean(error)}
          {...registration}
        />
        <button
          type="button"
          onClick={() => setVisible((value) => !value)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error ? <p className="text-xs text-red-500">{error.message}</p> : null}
    </div>
  );
}

/**
 * Change the logged-in account's password. The backend rotates the session on
 * success and returns fresh tokens, which are stored here.
 */
export default function ChangePasswordForm({ onSuccess, onCancel, submitLabel = "Change password" }) {
  const setSession = useAuthStore((state) => state.setSession);
  const updateUser = useAuthStore((state) => state.updateUser);
  const [saving, setSaving] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const response = await changePasswordApi({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      const body = response.data?.data || response.data || {};
      setSession({
        user: body.user,
        token: body.accessToken || body.token,
        refreshToken: body.refreshToken,
      });
      updateUser({ mustChangePassword: false });
      toast.success(body.message || response.data?.message || "Password changed successfully.");
      reset();
      onSuccess?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to change password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <PasswordField
        id="currentPassword"
        label="Current password"
        autoComplete="current-password"
        error={errors.currentPassword}
        registration={register("currentPassword", {
          required: "Current password is required",
        })}
      />
      <PasswordField
        id="newPassword"
        label="New password"
        autoComplete="new-password"
        error={errors.newPassword}
        registration={register("newPassword", {
          required: "New password is required",
          validate: (value) => {
            const rule = validateNewPassword(value);
            if (rule !== true) return rule;
            if (value === getValues("currentPassword")) {
              return "New password must be different from the current one";
            }
            return true;
          },
        })}
      />
      <PasswordField
        id="confirmPassword"
        label="Confirm new password"
        autoComplete="new-password"
        error={errors.confirmPassword}
        registration={register("confirmPassword", {
          required: "Please confirm the new password",
          validate: (value) => value === getValues("newPassword") || "Passwords do not match",
        })}
      />
      <p className="text-xs text-slate-500">
        At least 8 characters, with at least one letter and one digit.
      </p>
      <div className="flex gap-2 pt-1">
        {onCancel ? (
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" className="flex-1" disabled={saving}>
          {saving ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
