import ReportsCenter from "./engine/reports-center";

// Route: /reports  (opens a report with /reports?r=<key>)
export default function ReportsHubPage() {
  return (
    <div className="w-full min-w-0 p-2">
      <ReportsCenter />
    </div>
  );
}
