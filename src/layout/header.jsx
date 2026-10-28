import { useState } from "react";
import { ChevronDown, KeyRound, LogOut, User } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { logoutApi } from "@/api/authApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ChangePasswordForm from "@/auth/change-password-form";
import logo from "@/assets/logo.png";

export default function Header() {
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const role = useAuthStore((state) => state.role);
  const selectedStore = useAuthStore((state) => state.selectedStore);
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);

  const handleLogout = async () => {
    try {
      const response = await logoutApi();
      toast.success(response.data?.message || "Logout successful");
    } catch {
      // the server session may already be gone; the local session is cleared anyway
      toast.success("Logged out");
    } finally {
      logout();
      navigate("/login", { replace: true });
    }
  };

  return (
    <div className="h-16 bg-white/95 backdrop-blur border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
          <img src={logo} alt="Binnayak Jewellers logo" className="h-full w-full object-contain p-1" />
        </div>
        <div className="leading-tight">
          <div className="font-semibold text-slate-900">Binnayak Jewellers</div>
          <div className="text-xs text-slate-500">
            {selectedStore?.storeName || selectedStore?.name || "Jewellery ERP"}
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100">
            <div className="bg-blue-500 text-white w-8 h-8 flex items-center justify-center rounded-full">
              <User size={18} />
            </div>
            <span className="text-sm">{user?.name || user?.email || "User"}</span>
            <ChevronDown size={14} className="text-slate-500" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel className="text-xs font-normal text-slate-500">
            {user?.email}
            {role ? ` · ${role}` : ""}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setPasswordOpen(true)}>
            <KeyRound size={14} />
            Change password
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:text-red-600">
            <LogOut size={14} />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>Other devices signed in to this account will be logged out.</DialogDescription>
          </DialogHeader>
          {passwordOpen ? (
            <ChangePasswordForm
              onSuccess={() => setPasswordOpen(false)}
              onCancel={() => setPasswordOpen(false)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
