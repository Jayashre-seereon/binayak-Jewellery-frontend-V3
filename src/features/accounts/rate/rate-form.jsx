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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { notifyError } from "@/utils/notify";
import { getPuritiesByMetal } from "@/api/purity-api";
import { getGradesByPurity } from "@/api/grade-api";
import { makeNumericRules } from "@/utils/validation";

export default function RateForm({
  open,
  setOpen,
  onSave,
  defaultValues,
  metals,
}) {
  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {},
  });

  const [purities, setPurities] = useState([]);
  const [grades, setGrades] = useState([]);
  const [purityLoading, setPurityLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);

  const selectedMetalId = watch("metalId");
  const selectedPurityId = watch("purityId");
  const selectedGradeId = watch("gradeId");
  const selectedUnit = watch("unit");

  const unwrapList = (payload, key) => {
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.[key])) return payload[key];
    if (Array.isArray(payload)) return payload;
    return [];
  };

  useEffect(() => {
    if (!open) return;

    const initMetalId = defaultValues?.metalId ?? defaultValues?.metal?.id ?? "";
    const initPurityId = defaultValues?.purityId ?? defaultValues?.purity?.id ?? "";
    const initGradeId = defaultValues?.gradeId ?? defaultValues?.grade?.id ?? "";

    reset(
      defaultValues
        ? { ...defaultValues, metalId: initMetalId, purityId: initPurityId, gradeId: initGradeId }
        : { metalId: "", purityId: "", gradeId: "", unit: "", saleRate: "", exchangeRate: "", cashRate: "" }
    );

    setPurities([]);
    setGrades([]);

    if (initMetalId) loadPurities(initMetalId, initPurityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultValues]);

  const loadPurities = async (metalId, keepPurityId) => {
    setPurityLoading(true);
    try {
      const res = await getPuritiesByMetal(metalId);
      setPurities(unwrapList(res, "purities"));
      if (keepPurityId) {
        loadGrades(keepPurityId, defaultValues?.gradeId ?? defaultValues?.grade?.id ?? "");
      }
    } catch (error) {
      notifyError(error, "Failed to load purities.");
    } finally {
      setPurityLoading(false);
    }
  };

  const loadGrades = async (purityId, keepGradeId) => {
    setGradeLoading(true);
    try {
      const res = await getGradesByPurity(purityId);
      setGrades(unwrapList(res, "grades"));
      if (!keepGradeId) setValue("gradeId", "");
    } catch (error) {
      notifyError(error, "Failed to load grades.");
    } finally {
      setGradeLoading(false);
    }
  };

  const handleMetalChange = (val) => {
    setValue("metalId", val);
    setValue("purityId", "");
    setValue("gradeId", "");
    setGrades([]);
    if (val) loadPurities(val);
    else setPurities([]);
  };

  const handlePurityChange = (val) => {
    setValue("purityId", val);
    setValue("gradeId", "");
    if (val) loadGrades(val);
    else setGrades([]);
  };

  const submit = (data) => {
    onSave(data);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Rate Master</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(submit)} className="flex flex-col h-full">
          <div className="grid grid-cols-2 gap-4 overflow-y-auto max-h-[65vh] pr-2">

            <div>
              <label className="text-sm">Metal</label>
              <Select
                value={selectedMetalId ? String(selectedMetalId) : ""}
                onValueChange={handleMetalChange}
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
                value={selectedPurityId ? String(selectedPurityId) : ""}
                onValueChange={handlePurityChange}
                disabled={!selectedMetalId || purityLoading}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue
                    placeholder={!selectedMetalId ? "Select Metal first" : purityLoading ? "Loading..." : "Select Purity"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {purities.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm">Grade</label>
              <Select
                value={selectedGradeId ? String(selectedGradeId) : ""}
                onValueChange={(val) => setValue("gradeId", val)}
                disabled={!selectedPurityId || gradeLoading}
              >
                <SelectTrigger className="w-full h-9">
                  <SelectValue
                    placeholder={!selectedPurityId ? "Select Purity first" : gradeLoading ? "Loading..." : "Select Grade"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {grades.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm">Unit</label>
              <Select value={selectedUnit || ""} onValueChange={(val) => setValue("unit", val)}>
                <SelectTrigger className="w-full h-9">
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Gram">Gram</SelectItem>
                  <SelectItem value="Kg">Kg</SelectItem>
                  <SelectItem value="Piece">Piece</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm">Sale Rate</label>
              <Input type="number" className="h-9" {...register("saleRate", makeNumericRules({ label: "Sale Rate" }))} />
            </div>

            <div>
              <label className="text-sm">Exchange Rate</label>
              <Input type="number" className="h-9" {...register("exchangeRate", makeNumericRules({ label: "Exchange Rate" }))} />
            </div>

            <div>
              <label className="text-sm">Cash Rate</label>
              <Input type="number" className="h-9" {...register("cashRate", makeNumericRules({ label: "Cash Rate" }))} />
            </div>

          </div>

          <div className="flex justify-end gap-2 mt-4 pt-3 border-t">
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
