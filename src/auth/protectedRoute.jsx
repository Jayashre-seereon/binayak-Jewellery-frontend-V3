import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import ChangePasswordPage from "@/pages/changePasswordPage";

export default function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  const mustChangePassword = useAuthStore((state) => Boolean(state.user?.mustChangePassword));
  const role = useAuthStore((state) => state.role);
  const selectedStoreId = useAuthStore((state) => state.selectedStore?.id);
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // Accounts created or reset by an admin must set their own password first.
  if (mustChangePassword) {
    return <ChangePasswordPage forced />;
  }

  // Admins work on one store at a time; store-scoped screens need a selection first.
  const storeFree = ["/select-store", "/stores", "/change-password"].includes(location.pathname);
  if (role === "ADMIN" && !selectedStoreId && !storeFree) {
    return <Navigate to="/select-store" replace />;
  }

  return children;
}
