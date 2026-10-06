import FixedReportPage from "../fixed-report-page";

// "Old Stock Register" = piece-wise stock that came in as old gold / URD purchases.
const INITIAL = { purchaseType: "OLD" };

export default function OldStockPage() {
  return <FixedReportPage reportKey="stock-register" initialFilters={INITIAL} />;
}
