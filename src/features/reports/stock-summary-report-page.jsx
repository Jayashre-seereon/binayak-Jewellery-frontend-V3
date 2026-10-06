import FixedReportPage from "./fixed-report-page";

// Drop-in for the inventory "Stock Summary" route (features/inventory/summary is mock data).
export default function StockSummaryReportPage() {
  return <FixedReportPage reportKey="stock-summary" />;
}
