import BarcodeLabelsPage from "../labels/barcode-labels-page";

// Legacy menu entry: the real inventory label screen.
const PRESET = {
  title: "Branded Item Labels",
  description: "Print labels for branded pieces in stock.",
};

export default function BrandedBarcodingPage() {
  return <BarcodeLabelsPage preset={PRESET} />;
}
