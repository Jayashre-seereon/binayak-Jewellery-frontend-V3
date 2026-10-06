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

export default function ProductForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  categories = [],
  metals = [],
  purities = [],
  grades = [],
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      metalId: "",
      purityId: "",
      gradeId: "",
      image: null,
    },
  });
  const [preview, setPreview] = useState(null);
  const categoryValue = watch("categoryId");
  const metalValue = watch("metalId");
  const purityValue = watch("purityId");
  const gradeValue = watch("gradeId");

  const filteredPurities = metalValue
    ? purities.filter((p) => !p.metalId || String(p.metalId) === String(metalValue))
    : purities;

  const matchedGrade = grades.find(
    (g) =>
      (gradeValue && String(g.id) === String(gradeValue)) ||
      (purityValue && String(g.purityId) === String(purityValue))
  );

  useEffect(() => {
    if (open) {
      const catId = defaultValues?.categoryId || defaultValues?.category?.id || "";
      const mId = defaultValues?.metalId || defaultValues?.metal?.id || "";
      const pId = defaultValues?.purityId || defaultValues?.purity?.id || "";
      let gId = defaultValues?.gradeId || defaultValues?.grade?.id || "";

      if (!gId && pId && grades.length > 0) {
        const found = grades.find((g) => String(g.purityId) === String(pId));
        if (found) gId = found.id;
      }

      reset({
        name: defaultValues?.name || "",
        description: defaultValues?.description || "",
        categoryId: catId ? String(catId) : "",
        metalId: mId ? String(mId) : "",
        purityId: pId ? String(pId) : "",
        gradeId: gId ? String(gId) : "",
        image: null,
      });
      setPreview(defaultValues?.image || defaultValues?.imageUrl || null);
      setValue("categoryId", catId ? String(catId) : "");
      setValue("metalId", mId ? String(mId) : "");
      setValue("purityId", pId ? String(pId) : "");
      setValue("gradeId", gId ? String(gId) : "");
    }
  }, [defaultValues, open, reset, setValue, grades]);

  const handlePurityChange = (val) => {
    const purityVal = val === "NONE" ? "" : val;
    setValue("purityId", purityVal);
    if (!purityVal) {
      setValue("gradeId", "");
      return;
    }
    const foundGrade = grades.find((g) => String(g.purityId) === String(purityVal));
    if (foundGrade) {
      setValue("gradeId", String(foundGrade.id));
    } else {
      setValue("gradeId", "");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setValue("image", file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const submit = (data) => {
    onSave(data);
    reset();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[500px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Product Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="space-y-4">
          <div>
            <label className="text-sm">Product Name</label>
            <Input className="h-9" {...register("name")} />
          </div>

          <div>
            <label className="text-sm">Category</label>
            <Select
              value={String(categoryValue || "")}
              onValueChange={(value) => setValue("categoryId", value)}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm">Metal</label>
            <Select
              value={String(metalValue || "")}
              onValueChange={(value) => {
                setValue("metalId", value);
                setValue("purityId", "");
                setValue("gradeId", "");
              }}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Metal" />
              </SelectTrigger>
              <SelectContent>
                {metals.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm">Purity</label>
            <Select
              value={purityValue ? String(purityValue) : ""}
              onValueChange={handlePurityChange}
            >
              <SelectTrigger className="w-full h-9">
                <SelectValue placeholder="Select Purity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">-- No Purity --</SelectItem>
                {filteredPurities.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name} {p.metal?.name ? `(${p.metal.name})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm">Grade (Auto-populated from Purity)</label>
            <Input
              readOnly
              className="h-9 bg-slate-50 text-slate-700 font-medium cursor-not-allowed"
              value={
                matchedGrade
                  ? `${matchedGrade.name} (${matchedGrade.percentage}%)`
                  : defaultValues?.grade?.name
                  ? `${defaultValues.grade.name} (${defaultValues.grade.percentage}%)`
                  : purityValue
                  ? "Auto-matching Grade..."
                  : "Auto-populated when Purity is selected"
              }
            />
          </div>

          <div>
            <label className="text-sm">Reference Image</label>
            <Input type="file" accept="image/*" onChange={handleImageChange} />
          </div>

          {preview && (
            <img
              src={preview}
              alt="preview"
              className="w-20 h-20 object-cover border rounded"
            />
          )}

          <div>
            <label className="text-sm">Description</label>
            <Textarea rows={3} {...register("description")} />
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
