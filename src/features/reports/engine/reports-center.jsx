import { useSearchParams } from "react-router-dom";
import ReportsHub from "./reports-hub";
import ReportViewer from "./report-viewer";

/** Hub + viewer driven by the `?r=<report-key>` query param, so any route can host it and links are shareable. */
export default function ReportsCenter() {
  const [params, setParams] = useSearchParams();
  const key = params.get("r");

  const open = (k) => {
    const next = new URLSearchParams(params);
    next.set("r", k);
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    const next = new URLSearchParams(params);
    next.delete("r");
    setParams(next);
  };

  return key ? <ReportViewer key={key} reportKey={key} onBack={back} /> : <ReportsHub onOpen={open} />;
}
