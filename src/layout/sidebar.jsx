import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Users,
  ChevronDown,
  ChartLine,
  ArrowLeftRight,
  Wallet,
  ShoppingBag,
  BookOpen,
  NotepadText,
  User,
  ScanBarcode,
  Settings,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import logo from "@/assets/logo.png";

export default function Sidebar() {
  const [openMenu, setOpenMenu] = useState(null);
  const location = useLocation();
  const role = useAuthStore((state) => state.role);

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: "/dashboard",
    },
    {
      name: "Masters",
      icon: Users,
      children: [
        { name: "Brand Master", path: "/masters/brand" },
        { name: "Category Master", path: "/masters/category" },
        { name: "Metal Master", path: "/masters/metal" },
        { name: "Purity Master", path: "/masters/purity" },
        { name: "Grade Master", path: "/masters/grade" },
        { name: "Design Master", path: "/masters/design" },
        { name: "Product Master", path: "/masters/product" },
        { name: "Item Master", path: "/masters/item" },
        { name: "Stone Master", path: "/masters/stone" },
        { name: "Employee Master", path: "/masters/employee" },
        { name: "Party Type Master", path: "/masters/partytype" },
        { name: "Party Master", path: "/masters/party" },
        { name: "Party Opening Bal.", path: "/masters/openingbalance" },
      ],
    },
    {
      name: "Rate Master",
      icon: ChartLine,
      children: [{ name: "Rate Master", path: "/accounts/rate" }],
    },
    {
      name: "Purchase",
      icon: ShoppingCart,
      children: [{ name: "Purchase", path: "/purchase" }],
    },
    {
      name: "Inventory",
      icon: Boxes,
      children: [
        { name: "Stock Entry", path: "/inventory/stock-entry" },
        { name: "Tag from Purchase", path: "/inventory/inventory" },
        { name: "Stock Summary", path: "/inventory/stock" },
        { name: "Item Status", path: "/inventory/itemstatus" },
      ],
    },
    {
      name: "Barcoding",
      icon: ScanBarcode,
      children: [
        { name: "Barcode Labels", path: "/barcoding/labels" },
        { name: "Gold Ornament Labels", path: "/barcoding/gold" },
        { name: "Diamond Labels", path: "/barcoding/diamond" },
        { name: "MRP Labels", path: "/barcoding/mrp" },
        { name: "Branded Labels", path: "/barcoding/branded" },
      ],
    },
    {
      name: "Stock Movement",
      icon: ArrowLeftRight,
      children: [{ name: "Counter Transfer", path: "/stock/transfer" }],
    },
    {
      name: "Sales",
      icon: ShoppingBag,
      children: [
        { name: "Sales", path: "/sales" },
         ],
    },
    {
      name: "Accounting",
      icon: Wallet,
      children: [
        { name: "Journal Entry", path: "/accounts/journal" },
        { name: "Payment Voucher", path: "/accounts/payment" },
        { name: "Receipt Voucher", path: "/accounts/receipt" },
      ],
    },
     {
      name: "Customer History",
      icon: User,
      children: [
        { name: "Customer History", path: "/customer/history" },
      ],
    },
    {
      name: "Reports",
      icon: NotepadText,
      children: [
        { name: "Sales & Purchase", path: "/report/report" },
        { name: "All Reports", path: "/reports" },
        { name: "Sales Register", path: "/report/sales-register" },
        { name: "Sales Summary", path: "/report/sales-summary" },
        { name: "Purchase Register", path: "/report/purchase-register" },
        { name: "Old Gold Register", path: "/report/old-purchase" },
        { name: "Advance Register", path: "/report/advance-register" },
        { name: "Old Stock Register", path: "/report/old-stock-register" },
        { name: "Pure Metal Register", path: "/report/metal-register" },
        { name: "Day Book", path: "/reports/day-book" },
        { name: "Cash Book", path: "/reports/cash-book" },
        { name: "Trial Balance", path: "/reports/trial-balance" },
        { name: "GST Summary", path: "/reports/gst-summary" },
      ],
    },
    {
      name: "Settings",
      icon: Settings,
      children: [
        { name: "Barcode Settings", path: "/settings/barcode" },
        { name: "Change Password", path: "/change-password" },
        ...(role === "ADMIN" ? [{ name: "Stores", path: "/stores" }] : []),
      ],
    },
  ];

  // Auto expand parent dropdown when navigating to a child path
  useEffect(() => {
    const currentPath = location.pathname;
    const activeParent = menuItems.find((item) =>
      item.children?.some(
        (sub) =>
          currentPath === sub.path ||
          (sub.path !== "/" && currentPath.startsWith(sub.path))
      )
    );
    if (activeParent) {
      setOpenMenu(activeParent.name);
    }
  }, [location.pathname]);

  const toggleMenu = (name) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  const isParentActive = (item) => {
    if (!item.children) return false;
    return item.children.some(
      (sub) =>
        location.pathname === sub.path ||
        (sub.path !== "/" && location.pathname.startsWith(sub.path))
    );
  };

  return (
    <div className="w-64 shrink-0 bg-slate-950 text-white h-screen flex flex-col p-4 overflow-hidden select-none border-r border-white/10">
      <div className="mb-6 flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-lg shadow-black/20">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl bg-white">
            <img src={logo} alt="Binayak Jewellers logo" className="h-full w-full object-contain p-1" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-base font-semibold tracking-wide">Binayak Jewellers</div>
            <div className="text-xs text-slate-400">ERP Dashboard</div>
          </div>
        </div>
      </div>

      <nav className="flex flex-col gap-1 flex-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => (
          <div key={item.name}>
            {/* Main Menu */}
            {item.children ? (
              <div>
                <div
                  onClick={() => toggleMenu(item.name)}
                  className={`flex items-center justify-between p-3 rounded-lg hover:bg-slate-800 cursor-pointer flex-shrink-0 transition-colors ${
                    isParentActive(item)
                      ? "text-white font-medium bg-slate-800/60"
                      : "text-slate-300"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <item.icon size={18} className="flex-shrink-0" />
                    <span className="truncate">{item.name}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`flex-shrink-0 transition-transform duration-200 ${
                      openMenu === item.name ? "rotate-180" : ""
                    }`}
                  />
                </div>

                {/* Sub Menu */}
                {openMenu === item.name && (
                  <div className="ml-8 flex flex-col gap-1 mt-1">
                    {item.children.map((sub) => (
                      <NavLink
                        key={sub.name}
                        to={sub.path}
                        className={({ isActive }) =>
                          `p-2 rounded hover:bg-slate-800 flex-shrink-0 transition-colors text-sm ${
                            isActive
                              ? "bg-slate-800 text-white font-semibold"
                              : "text-slate-400 hover:text-slate-200"
                          }`
                        }
                      >
                        <span className="truncate block">{sub.name}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 flex-shrink-0 transition-colors ${
                    isActive
                      ? "bg-slate-800 text-white font-semibold"
                      : "text-slate-300"
                  }`
                }
              >
                <item.icon size={18} className="flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
} 
