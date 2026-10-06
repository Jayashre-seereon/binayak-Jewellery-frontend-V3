import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getItemsByProduct } from "@/api/item-api";

export default function StoneForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  products,
}) {
  const [items, setItems] = useState([]);
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      description: "",
      productId: "",
      itemId: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: defaultValues?.name || "",
        description: defaultValues?.description || "",
        productId: defaultValues?.productId
          ? String(defaultValues.productId)
          : "",
        itemId: defaultValues?.itemId ? String(defaultValues.itemId) : "",
      });
    }
  }, [open, defaultValues, reset]);

  const submit = async (data) => {
    const saved = await onSave(data);
    // keep the dialog (and the user's input) open when the save fails
    if (saved === false) return;
    reset();
    setOpen(false);
  };

  const productId = watch("productId");
  const itemId = watch("itemId");

  useEffect(() => {
    if (!open) return;

    let active = true;
    (async () => {
      if (!productId) {
        if (active) setItems([]);
        return;
      }

      try {
        const response = await getItemsByProduct(productId);
        if (!active) return;
        setItems(Array.isArray(response) ? response : []);
      } catch {
        if (active) setItems([]);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, productId]);

  useEffect(() => {
    if (!open) return;
    if (!productId) {
      setValue("itemId", "");
    }
  }, [open, productId, setValue]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{defaultValues ? "Edit Stone" : "Add Stone"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label className="text-sm">Stone Name</label>
            <Input className="h-9" {...register("name", { required: true })} />
          </div>

          <div>
            <label className="text-sm">Description</label>
            <Textarea className="min-h-[70px]" {...register("description")} />
          </div>

          {/* Product Dropdown */}
          <div>
            <label className="text-sm">Product</label>
            <Select
              value={productId || undefined}
              onValueChange={(val) => {
                setValue("productId", val);
                setValue("itemId", "");
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Product" />
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

          {/* Item Dropdown */}
          <div>
            <label className="text-sm">Item</label>
            <Select
              value={itemId || undefined}
              onValueChange={(val) => setValue("itemId", val)}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Item" />
              </SelectTrigger>
              <SelectContent>
                {items.map((i) => (
                  <SelectItem key={i.id} value={String(i.id)}>
                    {i.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2">
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
