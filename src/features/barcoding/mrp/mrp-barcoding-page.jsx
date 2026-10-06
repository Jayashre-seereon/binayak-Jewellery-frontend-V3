import BarcodeLabelsPage from "../labels/barcode-labels-page";

// Legacy menu entry: the real inventory label screen.
const PRESET = {
  title: "MRP Item Labels",
  description: "Print labels for fixed-price (MRP) items in stock.",
};

export default function MrpBarcodingPage() {
  return <BarcodeLabelsPage preset={PRESET} />;
}
