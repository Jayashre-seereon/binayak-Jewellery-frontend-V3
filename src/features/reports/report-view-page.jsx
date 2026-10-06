import { useNavigate, useParams } from "react-router-dom";
import ReportViewer from "./engine/report-viewer";

// Route: /reports/:key
export default function ReportViewPage() {
  const { key } = useParams();
  const navigate = useNavigate();
  return (
    <div className="w-full min-w-0 p-2">
      <ReportViewer key={key} reportKey={key} onBack={() => navigate("/report/report?tab=all")} />
    </div>
  );
}
