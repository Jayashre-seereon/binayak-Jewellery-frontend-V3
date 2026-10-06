import { getInventoryByCode, searchInventories } from "@/api/barcode-api";

const same = (a, b) => a && b && String(a).trim().toUpperCase() === String(b).trim().toUpperCase();

/**
 * Finds one piece by barcode. /getByBarcode matches barcodeNo; when that misses, a server search
 * (any status) is used to match tag no., HUID or inventory code exactly.
 * Returns { inventory, matchedBy } or null.
 */
export const getItemStatus = async (code) => {
  const value = String(code || "").trim();
  if (!value) return null;
  try {
    const inventory = await getInventoryByCode(value);
    if (inventory) return { inventory, matchedBy: "Barcode" };
  } catch (error) {
    if (error?.response?.status && error.response.status !== 404) throw error;
  }
  const { inventories } = await searchInventories({ status: "", search: value, page: 1, limit: 10 });
  const fields = [
    ["barcodeNo", "Barcode"],
    ["tagNo", "Tag No."],
    ["huidNo", "HUID"],
    ["inventoryCode", "Inventory code"],
    ["barSerialNo", "Bar serial no."],
  ];
  for (const [field, label] of fields) {
    const hit = inventories.find((inv) => same(inv[field], value));
    if (hit) return { inventory: hit, matchedBy: label };
  }
  return null;
};
