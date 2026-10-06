import { createBrowserRouter, Navigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import DashboardLayout from "@/layout/dashboard-layout";
import Dashboard from "@/features/dashboard/dashboard";
import LoginPage from "@/pages/loginPage";
import StoreSelectionPage from "@/pages/storeSelectionPage";
import ProtectedRoute from "@/auth/protectedRoute";
import RoleGuard from "@/auth/roleGuard";
import BrandPage from "@/features/masters/brand/brand-page";
import CategoryMaster from "@/features/masters/category/category-page";
import MetalPage from "@/features/masters/metal/metal-page";
import PurityPage from "@/features/masters/purity/purity-page";
import GradePage from "@/features/masters/grade/grade-page";
import DesignPage from "@/features/masters/design/design-page";
import StorePage from "@/features/store/store-page";
import ProductPage from "@/features/masters/product/product-page";
import ItemPage from "@/features/masters/item/item-page";
import StonePage from "@/features/masters/stone/stone-page";
import EmployeePage from "@/features/masters/employee/employee-page";
import PartyTypePage from "@/features/masters/party-type/party-type-page";
import PartyPage from "@/features/masters/party/party-page";
import PartyOpeningPage from "@/features/masters/party-opening/party-opening-page";
import RatePage from "@/features/accounts/rate/rate-page";
import OldPurchasePage from "@/features/purchase/old/old-purchase-page";
import BarcodingPage from "@/features/barcoding/goldornament/gold-barcoding-page";
import DiamondBarcodingPage from "@/features/barcoding/diamond/dimond-barcoding-page";
import MrpBarcodingPage from "@/features/barcoding/mrp/mrp-barcoding-page";
import BrandedBarcodingPage from "@/features/barcoding/branded/branded-barcoding-page";
import StockSummaryPage from "@/features/inventory/summary/stock-summary-page";
import ItemStatusPage from "@/features/inventory/itemstatus/ItemStatusPage";
import StockPage from "@/features/inventory/add-stock/stock-page";
import StockEntryPage from "@/features/inventory/stock-entry/stock-entry-page";
import TransferPage from "@/features/inventory/counter-transfer/transfer-page";
import SalesPage from "@/features/sales/sale-estimate/sales-estimate-page";
import PaymentPage from "@/features/accounts/payment/payment-page";
import ReceiptPage from "@/features/accounts/receipt/receipt-page";
import JournalPage from "@/features/accounts/journal/journal-page";
import SaleSummaryPage from "@/features/reports/sale-summary/sale-summary-page";
import PurchaeRegisterPage from "@/features/reports/purchase-register/purchase-register-page";
import OldPurchaseRegisterPage from "@/features/reports/old-purchase/old-purchase-page";
import AdvanceRegisterPage from "@/features/reports/advance-register/advance-register-page";
import SalesRegisterPage from "@/features/reports/sales-register/sales-register-page";
import OldStockPage from "@/features/reports/old-stock-register/old-stock-page";
import PureMetalPage from "@/features/reports/pure-metal-register/pure-metal-page";
import CustomerHistoryPage from "../features/customer-history/customer-history-page";
import ReportPage from "@/features/reports/reportPage";
import ReportsHubPage from "@/features/reports/reports-hub-page";
import ReportViewPage from "@/features/reports/report-view-page";
import BarcodeSettingsPage from "@/features/settings/barcode/barcode-settings-page";
import BarcodeLabelsPage from "@/features/barcoding/labels/barcode-labels-page";
import ChangePasswordPage from "@/pages/changePasswordPage";
export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginPage />,
  },

  {
    path: "/select-store",
    element: (
      <ProtectedRoute>
        <RoleGuard roles={["ADMIN"]}>
          <StoreSelectionPage />
        </RoleGuard>
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <RootRedirect />,
  },

  {
    path: "/",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/dashboard" /> },
      { path: "dashboard", element: <Dashboard /> },
      { path: "masters/brand", element: <BrandPage /> },
      { path: "masters/category", element: <CategoryMaster /> },
      { path: "masters/metal", element: <MetalPage /> },
      { path: "masters/purity", element: <PurityPage /> },
      { path: "masters/grade", element: <GradePage /> },
      { path: "masters/design", element: <DesignPage /> },
      { path: "masters/product", element: <ProductPage /> },
      { path: "masters/item", element: <ItemPage /> },
      { path: "masters/stone", element: <StonePage /> },
      { path: "masters/employee", element: <EmployeePage /> },
      { path: "masters/partytype", element: <PartyTypePage /> },
      { path: "masters/party", element: <PartyPage /> },
      { path: "masters/openingbalance", element: <PartyOpeningPage /> },
      // rate master routes
      { path: "accounts/rate", element: <RatePage /> },
      // purchase routes 
       { path: "purchase", element: <OldPurchasePage /> },

      // barcoding routes will be added here
      { path: "barcoding/gold", element: <BarcodingPage /> },
      { path: "barcoding/diamond", element: <DiamondBarcodingPage /> },
      { path: "barcoding/mrp", element: <MrpBarcodingPage /> },
      { path: "barcoding/branded", element: <BrandedBarcodingPage /> },
      { path: "barcoding/labels", element: <BarcodeLabelsPage /> },
      { path: "settings/barcode", element: <BarcodeSettingsPage /> },
      { path: "change-password", element: <ChangePasswordPage /> },
      { path: "stores", element: <RoleGuard roles={["ADMIN"]}><StorePage /></RoleGuard> },
      // inventory routes
      { path: "inventory/stock-entry", element: <StockEntryPage /> },
      { path: "inventory/stock", element: <StockSummaryPage /> },
      { path: "inventory/itemstatus", element: <ItemStatusPage /> },
      { path: "inventory/inventory", element: <StockPage /> },
      // counter transfer route will be added here
      { path: "stock/transfer", element: <TransferPage /> },
      // sales routes will be added here
      { path: "sales", element: <SalesPage /> },
      { path: "customer/history", element: <CustomerHistoryPage /> },
      // advance routes redirect to Receipt Voucher (ADVANCE)
      { path: "advance/recieve", element: <Navigate to="/accounts/receipt?tab=ADVANCE" replace /> },
      // accounts routes will be added here
      { path: "accounts/payment", element: <PaymentPage /> },
      { path: "accounts/receipt", element: <ReceiptPage /> },
      { path: "accounts/journal", element: <JournalPage /> },
      // reports routes will be added here
      { path: "report/sales-summary", element: <SaleSummaryPage /> },
      { path: "report/purchase-register", element: <PurchaeRegisterPage /> },
      { path: "report/old-purchase", element: <OldPurchaseRegisterPage /> },
      { path: "report/advance-register", element: <AdvanceRegisterPage /> },
      { path: "report/sales-register", element: <SalesRegisterPage /> },
      { path: "report/old-stock-register", element: <OldStockPage /> },
      { path: "report/metal-register", element: <PureMetalPage /> },
      { path: "report/report", element: <ReportPage /> },
      { path: "reports", element: <ReportsHubPage /> },
      { path: "reports/:key", element: <ReportViewPage /> },

      
    ],
  },
]);

function RootRedirect() {
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (role === "ADMIN") {
    return <Navigate to="/select-store" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}
