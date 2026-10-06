import { Fragment, useEffect, useRef } from "react";
import { Select } from "antd";
import { CheckCircle2, Copy, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { money } from "@/utils/units";
import { MODES, SALE_MAKING_TYPES, decimalInput, intInput, lineValue, netWeight, normalizeCode } from "./stock-entry-model";

const cellInput =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50";
const cellSelect =
  "h-8 w-full rounded-md border border-slate-300 bg-white px-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500";
const numCls = `${cellInput} text-right tabular-nums`;

const focusCell = (container, index, col) => {
  const cell = container?.querySelector(`[data-cell="${index}-${col}"]`);
  const target = cell?.matches("input, select") ? cell : cell?.querySelector("input");
  target?.focus();
  if (col === "barcode") target?.select();
};

function BarcodeHint({ row, check, duplicate }) {
  const code = normalizeCode(row.barcode);
  if (!code) return null;
  if (duplicate) return <p className="mt-0.5 text-[10px] font-medium text-red-600">Duplicate in this entry</p>;
  if (!check || check.code !== code) return null;
  if (check.state === "checking")
    return (
      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" /> Checking…
      </p>
    );
  if (check.state === "ok")
    return (
      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-emerald-700">
        <CheckCircle2 className="h-3 w-3" /> Free to use
      </p>
    );
  if (check.state === "taken")
    return (
      <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-red-600" title={check.usedBy || undefined}>
        <XCircle className="h-3 w-3 shrink-0" /> <span className="truncate">Used{check.usedBy ? ` by ${check.usedBy}` : ""}</span>
      </p>
    );
  return <p className="mt-0.5 text-[10px] text-slate-500">Could not check now</p>;
}

/**
 * One row = one tagged piece. Keyboard: Enter in a barcode cell jumps to the next row's barcode cell
 * (a USB scanner types the code and sends Enter); Enter in the last cell of a row adds a new row.
 */
export default function StockEntryGrid({
  mode,
  rows,
  itemSelectOptions,
  purities,
  loading,
  rowErrors,
  duplicateKeys,
  barcodeChecks,
  onChangeRow,
  onItemChange,
  onBarcodeBlur,
  onAddRow,
  onDuplicateRow,
  onDeleteRow,
}) {
  const containerRef = useRef(null);
  const pendingFocus = useRef(null);
  const purchase = mode === MODES.PURCHASE;

  useEffect(() => {
    if (!pendingFocus.current) return;
    const { index, col } = pendingFocus.current;
    if (index < rows.length) {
      pendingFocus.current = null;
      focusCell(containerRef.current, index, col);
    }
  }, [rows]);

  const goTo = (index, col) => {
    if (index < rows.length) focusCell(containerRef.current, index, col);
    else {
      pendingFocus.current = { index, col };
      onAddRow();
    }
  };

  const onBarcodeKey = (e, index) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    goTo(index + 1, "barcode");
  };

  const onLastCellKey = (e, index) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    goTo(index + 1, "item");
  };

  const lastCol = purchase ? "stoneAmount" : "saleMakingRate";
  const colCount = purchase ? 15 : 11;

  return (
    <div ref={containerRef} className="overflow-x-auto rounded-lg border border-slate-200 bg-white" data-scanner-ignore>
      <table className={`w-full text-xs ${purchase ? "min-w-[1440px]" : "min-w-[1080px]"}`}>
        <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase text-slate-600">
          <tr>
            <th className="w-8 px-2 py-2 text-left">#</th>
            <th className="min-w-[220px] px-2 py-2 text-left">Item *</th>
            <th className="w-[110px] px-2 py-2 text-left">Purity</th>
            <th className="w-[56px] px-2 py-2 text-right">Pcs</th>
            <th className="w-[84px] px-2 py-2 text-right">Gross g *</th>
            <th className="w-[84px] px-2 py-2 text-right">Stone g</th>
            <th className="w-[80px] px-2 py-2 text-right">Net g</th>
            <th className="w-[92px] px-2 py-2 text-left">HUID</th>
            <th className="w-[150px] px-2 py-2 text-left">Barcode</th>
            <th className="w-[150px] px-2 py-2 text-left">Sale making</th>
            {purchase && (
              <>
                <th className="w-[84px] px-2 py-2 text-right">Rate ₹/g</th>
                <th className="w-[84px] px-2 py-2 text-right">Making ₹</th>
                <th className="w-[84px] px-2 py-2 text-right">Stone ₹</th>
                <th className="w-[96px] px-2 py-2 text-right">Value ₹</th>
              </>
            )}
            <th className="w-[64px] px-2 py-2 text-center">
              <span className="sr-only">Row actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => {
            const errors = rowErrors[row.key];
            const duplicate = duplicateKeys.has(row.key);
            const label = (col) => `Row ${index + 1} ${col}`;
            const set = (field) => (e) => onChangeRow(row.key, field, e.target.value);
            const setDecimal = (field) => (e) => onChangeRow(row.key, field, decimalInput(e.target.value));
            return (
              <Fragment key={row.key}>
                <tr className={errors ? "bg-red-50/70" : row.unmatchedName ? "bg-amber-50" : undefined}>
                  <td className="px-2 py-1.5 text-slate-500">{index + 1}</td>
                  <td className="px-2 py-1.5" data-cell={`${index}-item`}>
                    <Select
                      showSearch={{ optionFilterProp: "label" }}
                      allowClear
                      size="middle"
                      className="w-full"
                      aria-label={label("item")}
                      status={errors && !row.itemId ? "error" : undefined}
                      placeholder={row.unmatchedName ? `Not found: ${row.unmatchedName}` : loading ? "Loading items…" : "Search item"}
                      loading={loading}
                      value={row.itemId || undefined}
                      options={itemSelectOptions}
                      popupMatchSelectWidth={340}
                      onChange={(value) => onItemChange(row.key, value ? String(value) : "")}
                      notFoundContent={loading ? "Loading…" : "No matching item"}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <select
                      aria-label={label("purity")}
                      className={cellSelect}
                      value={row.purityId}
                      onChange={set("purityId")}
                    >
                      <option value="">Choose…</option>
                      {purities.map((p) => (
                        <option key={p.id} value={String(p.id)}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={label("pieces")}
                      inputMode="numeric"
                      className={numCls}
                      value={row.pieces}
                      onChange={(e) => onChangeRow(row.key, "pieces", intInput(e.target.value))}
                    />
                  </td>
                  <td className="px-2 py-1.5">
                    <input aria-label={label("gross weight")} inputMode="decimal" className={numCls} value={row.grossWeight} onChange={setDecimal("grossWeight")} />
                  </td>
                  <td className="px-2 py-1.5">
                    <input aria-label={label("stone weight")} inputMode="decimal" className={numCls} value={row.stoneWeight} onChange={setDecimal("stoneWeight")} />
                  </td>
                  <td className="px-2 py-1.5 text-right font-medium tabular-nums text-slate-800">
                    {netWeight(row).toFixed(3)}
                  </td>
                  <td className="px-2 py-1.5">
                    <input
                      aria-label={label("HUID")}
                      className={`${cellInput} font-mono uppercase`}
                      value={row.huidNo}
                      maxLength={16}
                      onChange={(e) => onChangeRow(row.key, "huidNo", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                    />
                  </td>
                  <td className="px-2 py-1.5 align-top">
                    <input
                      data-cell={`${index}-barcode`}
                      aria-label={label("barcode")}
                      placeholder="Auto"
                      autoComplete="off"
                      className={`${cellInput} font-mono ${duplicate ? "border-red-500" : ""}`}
                      value={row.barcode}
                      onChange={set("barcode")}
                      onKeyDown={(e) => onBarcodeKey(e, index)}
                      onBlur={() => onBarcodeBlur(row.key)}
                    />
                    <BarcodeHint row={row} check={barcodeChecks[row.key]} duplicate={duplicate} />
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex gap-1">
                      <select
                        aria-label={label("sale making type")}
                        className={`${cellSelect} w-[72px]`}
                        value={row.saleMakingType}
                        onChange={set("saleMakingType")}
                      >
                        <option value="">Type</option>
                        {SALE_MAKING_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label={label("sale making rate")}
                        inputMode="decimal"
                        className={numCls}
                        value={row.saleMakingRate}
                        onChange={setDecimal("saleMakingRate")}
                        onKeyDown={lastCol === "saleMakingRate" ? (e) => onLastCellKey(e, index) : undefined}
                      />
                    </div>
                  </td>
                  {purchase && (
                    <>
                      <td className="px-2 py-1.5">
                        <input aria-label={label("rate per gram")} inputMode="decimal" className={numCls} value={row.rate} onChange={setDecimal("rate")} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input aria-label={label("making charges")} inputMode="decimal" className={numCls} value={row.makingCharges} onChange={setDecimal("makingCharges")} />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          aria-label={label("stone amount")}
                          inputMode="decimal"
                          className={numCls}
                          value={row.stoneAmount}
                          onChange={setDecimal("stoneAmount")}
                          onKeyDown={(e) => onLastCellKey(e, index)}
                        />
                      </td>
                      <td className="px-2 py-1.5 text-right font-medium tabular-nums text-slate-800">
                        {money(lineValue(row))}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1.5">
                    <div className="flex justify-center gap-0.5">
                      <Button type="button" variant="ghost" size="icon-sm" title="Duplicate row" aria-label={`Duplicate row ${index + 1}`} onClick={() => onDuplicateRow(row.key)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        title="Delete row"
                        aria-label={`Delete row ${index + 1}`}
                        className="text-red-600 hover:text-red-700"
                        onClick={() => onDeleteRow(row.key)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
                {errors && (
                  <tr className="bg-red-50/70">
                    <td />
                    <td colSpan={colCount - 1} className="px-2 pb-1.5 text-[11px] text-red-700">
                      {errors.join(" · ")}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
      <div className="border-t border-slate-100 p-2">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => goTo(rows.length, "item")}>
          <Plus className="h-3.5 w-3.5" /> Add row
        </Button>
      </div>
    </div>
  );
}
