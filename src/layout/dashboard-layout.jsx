import Sidebar from "./sidebar";
import Header from "./header";
import { Outlet } from "react-router-dom";

export default function DashboardLayout() {
  return (
    <div className="flex h-screen w-full bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Right Side */}
      <div className="flex flex-col flex-1 min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="p-6 overflow-y-auto flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}