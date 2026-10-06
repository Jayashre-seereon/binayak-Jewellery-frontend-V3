import { useNavigate } from "react-router-dom";
import ReportViewer from "./engine/report-viewer";

/** A route that always shows one engine report (used by the old per-report menu paths). */
export default function FixedReportPage({ reportKey, initialFilters }) {
  const navigate = useNavigate();
  return (
    <div className="w-full min-w-0 p-2">
      <ReportViewer reportKey={reportKey} initialFilters={initialFilters} onBack={() => navigate("/report/report?tab=all")} />
    </div>
  );
}
