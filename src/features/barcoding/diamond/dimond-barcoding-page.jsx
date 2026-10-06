import BarcodeLabelsPage from "../labels/barcode-labels-page";

// Legacy menu entry: the real inventory label screen with a preset filter.
const PRESET = {
  title: "Diamond Jewellery Labels",
  description: "Pieces whose item / product name mentions diamond. Clear the search to see all stock.",
  search: "diamond",
};

export default function DiamondBarcodingPage() {
  return <BarcodeLabelsPage preset={PRESET} />;
}
