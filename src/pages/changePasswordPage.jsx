import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ChangePasswordForm from "@/auth/change-password-form";
import { useAuthStore } from "@/store/authStore";
import { logoutApi } from "@/api/authApi";
import logo from "@/assets/logo.png";

/**
 * Full-screen password change. ProtectedRoute renders this in place of the app
 * while `user.mustChangePassword` is set; it can also be routed at /change-password.
 */
export default function ChangePasswordPage({ forced = false }) {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // session is cleared locally regardless
    }
    logout();
    navigate("/login", { replace: true });
  };

  const handleSuccess = () => {
    // When forced, ProtectedRoute re-renders the requested page once the flag clears.
    if (forced) return;
    navigate(role === "ADMIN" ? "/select-store" : "/dashboard", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8">
      <Card className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
        <CardContent className="p-7">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-amber-50 p-1">
              <img src={logo} alt="Binnayak Jewellers logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="font-semibold text-slate-900">Binnayak Jewellers</div>
              <div className="text-xs text-slate-500">{user?.name || user?.email}</div>
            </div>
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Change your password</h1>
          <p className="mt-2 text-sm text-slate-500">
            {forced
              ? "Your password was set or reset by an administrator. Choose a new password to continue."
              : "Enter your current password and choose a new one."}
          </p>

          <div className="mt-6">
            <ChangePasswordForm
              onSuccess={handleSuccess}
              onCancel={forced ? undefined : () => navigate(-1)}
              submitLabel={forced ? "Set new password" : "Change password"}
            />
          </div>

          {forced ? (
            <Button variant="ghost" className="mt-4 w-full text-slate-500" onClick={handleLogout}>
              Log out
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
