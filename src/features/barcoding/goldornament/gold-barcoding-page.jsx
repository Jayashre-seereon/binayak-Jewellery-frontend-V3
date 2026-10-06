import BarcodeLabelsPage from "../labels/barcode-labels-page";

// Legacy menu entry: the real inventory label screen with a preset filter.
const PRESET = {
  title: "Gold Ornament Labels",
  description: "Tagged gold ornaments in stock. Select pieces or scan tags, then print labels.",
  metalPattern: /gold/i,
  purchaseType: "ORNAMENT",
};

export default function BarcodingPage() {
  return <BarcodeLabelsPage preset={PRESET} />;
}
