import { Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function RoleGuard({ children, roles }) {
  const role = useAuthStore((state) => state.role);

  if (!role || !roles.includes(role)) {
    return <Navigate to="/dashboard" />;
  }

  return children;
}
