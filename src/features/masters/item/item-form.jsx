import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { validateBarcodeText } from "@/lib/barcode/validate";
import ItemBarcodePanel from "./item-barcode-panel";
import { ITEM_CODE_HELP, ITEM_CODE_MODES } from "./item-code";

const NONE = "NONE";
const EMPTY_CODE = { mode: "none", code: "", error: null };

export default function ItemForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  products = [],
  designs = [],
  purities = [],
  onBarcodeChange,
}) {
  const [preview, setPreview] = useState(null);
  // Item code for an item being created: sent with the create request.
  const [newCode, setNewCode] = useState(EMPTY_CODE);
  const isEdit = Boolean(defaultValues?.id);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      name: "",
      productId: "",
      designId: "",
      purityId: "",
      description: "",
      image: null,
    },
  });
  const productValue = watch("productId");
  const designValue = watch("designId");
  const purityValue = watch("purityId");

  const selectedProduct = products.find((p) => String(p.id) === String(productValue));

  useEffect(() => {
    if (open) {
      const existingImage =
        defaultValues?.imageUrl ||
        defaultValues?.image ||
        defaultValues?.photo ||
        null;
      const prodId = defaultValues?.productId ?? defaultValues?.product?.id ?? "";
      const desId = defaultValues?.designId ?? defaultValues?.design?.id ?? "";
      const purId = defaultValues?.purityId ?? defaultValues?.purity?.id ?? "";

      reset({
        name: defaultValues?.name || "",
        productId: prodId ? String(prodId) : "",
        designId: desId ? String(desId) : "",
        purityId: purId ? String(purId) : "",
        description: defaultValues?.description || "",
        image: null,
      });
      setPreview(existingImage);
      setNewCode(EMPTY_CODE);
    }
  }, [defaultValues, open, reset]);

  // Picking a product fills the purity only when the user has not chosen one.
  const handleProductChange = (val) => {
    setValue("productId", val);
    if (purityValue) return;
    const prod = products.find((p) => String(p.id) === String(val));
    const productPurity = prod?.purityId ?? prod?.purity?.id;
    if (productPurity) setValue("purityId", String(productPurity));
  };

  const submit = async (data) => {
    const payload = { ...data };
    if (!isEdit) {
      if (newCode.mode === "assign") {
        const error = validateBarcodeText(newCode.code);
        if (error) {
          setNewCode((c) => ({ ...c, error }));
          return;
        }
        payload.barcode = newCode.code.trim();
      } else if (newCode.mode === "generate") {
        payload.generateBarcode = true;
      }
    }
    const saved = await onSave(payload);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
    setPreview(null);
    setOpen(false);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("image", file);
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
      setPreview(URL.createObjectURL(file));
    }
  };

  useEffect(() => {
    return () => {
      if (preview?.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[560px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Item Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label htmlFor="item-name" className="text-sm font-medium">Item Name *</label>
            <Input
              id="item-name"
              className={`h-9 mt-1 ${errors.name ? "border-red-500" : ""}`}
              placeholder="e.g. Ladies Ring"
              {...register("name", {
                validate: (v) => (String(v || "").trim() ? true : "Item name is required"),
              })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Product</label>
              <Select value={String(productValue || "")} onValueChange={handleProductChange}>
                <SelectTrigger className="w-full h-9 mt-1" aria-label="Product">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium">Purity</label>
              <Select
                value={purityValue ? String(purityValue) : ""}
                onValueChange={(val) => setValue("purityId", val === NONE ? "" : val)}
              >
                <SelectTrigger className="w-full h-9 mt-1" aria-label="Purity">
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>-- No Purity --</SelectItem>
                  {purities.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name} {p.metal?.name ? `(${p.metal.name})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedProduct && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
              <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider mb-2">
                Product Attributes (Read-Only)
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Category</span>
                  <span className="font-medium text-slate-800">{selectedProduct.category?.name || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Metal</span>
                  <span className="font-medium text-slate-800">{selectedProduct.metal?.name || "-"}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Purity</span>
                  <span className="font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block text-xs font-semibold">
                    {selectedProduct.purity?.name || "-"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 block">Grade</span>
                  <span className="font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 inline-block text-xs font-semibold">
                    {selectedProduct.grade?.name
                      ? `${selectedProduct.grade.name}${selectedProduct.grade.percentage ? ` (${selectedProduct.grade.percentage}%)` : ""}`
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="text-sm font-medium">Design</label>
            <Select value={String(designValue || "")} onValueChange={(val) => setValue("designId", val)}>
              <SelectTrigger className="w-full h-9 mt-1" aria-label="Design">
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {designs.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isEdit ? (
            <ItemBarcodePanel item={defaultValues} onChange={onBarcodeChange} />
          ) : (
            <div className="space-y-1.5 rounded-md border border-slate-200 bg-slate-50 p-3" data-scanner-ignore>
              <label htmlFor="item-code-mode" className="text-sm font-medium">Item code (barcode)</label>
              <select
                id="item-code-mode"
                className="h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm"
                value={newCode.mode}
                onChange={(e) => setNewCode({ mode: e.target.value, code: "", error: null })}
              >
                {ITEM_CODE_MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {newCode.mode === "assign" && (
                <>
                  <Input
                    autoFocus
                    aria-label="Existing item code"
                    className={`h-9 font-mono ${newCode.error ? "border-red-500" : ""}`}
                    placeholder="Scan or type the barcode"
                    value={newCode.code}
                    onChange={(e) => setNewCode({ mode: "assign", code: e.target.value, error: null })}
                    onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
                  />
                  {newCode.error && <p className="text-xs text-red-600">{newCode.error}</p>}
                </>
              )}
              <p className="text-[11px] text-slate-500">{ITEM_CODE_HELP}</p>
            </div>
          )}

          <div>
            <label htmlFor="item-description" className="text-sm font-medium">Description</label>
            <Textarea
              id="item-description"
              className="min-h-[70px] mt-1"
              placeholder="Item description or specifications..."
              {...register("description")}
            />
          </div>

          <div>
            <label htmlFor="item-image" className="text-sm font-medium">Reference Image</label>
            <Input id="item-image" type="file" accept="image/*" onChange={handleImageChange} className="mt-1" />
          </div>

          {preview && (
            <img
              src={preview}
              alt="preview"
              className="w-20 h-20 object-cover border rounded"
            />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
