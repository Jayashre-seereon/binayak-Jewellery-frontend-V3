import { Table } from "antd";
import { formatDate, formatMoney, formatWeight, saleInvoiceValue, saleTax, netWeightOf } from "./engine/report-utils";

const money = (v) => <span className="tabular-nums">{formatMoney(v)}</span>;
const TYPE_LABEL = { ORNAMENT: "Ornament", BULLION: "Bullion", OLD: "Old Gold / URD" };

const ReportTable = ({ type, data = [], loading = false }) => {
  const salesColumns = [
    { title: "Date", dataIndex: "saleDate", key: "saleDate", width: 115, render: (v) => formatDate(v) || "-" },
    {
      title: "Invoice No",
      dataIndex: "invoiceNo",
      key: "invoiceNo",
      width: 170,
      render: (v, r) => (
        <span className="whitespace-nowrap">
          {v || "-"}
          {r.status === "CANCELLED" && <span className="ml-2 rounded bg-red-50 px-1.5 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">Cancelled</span>}
        </span>
      ),
    },
    { title: "Customer", dataIndex: "customerName", key: "customerName", width: 180, ellipsis: true, render: (v, r) => v || r.party?.name || "Walk-in" },
    { title: "Phone", dataIndex: "customerPhone", key: "customerPhone", width: 120, render: (v) => (v && v !== "0" ? v : "-") },
    { title: "Pcs", key: "items", align: "center", width: 60, render: (_, r) => (r.items || []).reduce((t, i) => t + (Number(i.pieces) || 1), 0) },
    { title: "Net Wt (g)", key: "netWeight", align: "right", width: 100, render: (_, r) => <span className="tabular-nums">{formatWeight(netWeightOf(r))}</span> },
    { title: "Taxable", dataIndex: "taxableAmount", key: "taxableAmount", align: "right", width: 130, render: money },
    { title: "GST", key: "gst", align: "right", width: 110, render: (_, r) => money(saleTax(r)) },
    { title: "Invoice Value", key: "invoiceValue", align: "right", width: 140, render: (_, r) => <span className="font-semibold tabular-nums">{formatMoney(saleInvoiceValue(r))}</span> },
    { title: "Discount", key: "discount", align: "right", width: 110, render: (_, r) => money(Number(r.discount || 0) + Number(r.offerDiscount || 0)) },
    { title: "Old Gold", dataIndex: "oldGoldAmount", key: "oldGoldAmount", align: "right", width: 120, render: money },
    { title: "Advance", dataIndex: "advanceAmount", key: "advanceAmount", align: "right", width: 120, render: money },
    { title: "Net Payable", dataIndex: "netPayable", key: "netPayable", align: "right", width: 130, render: money },
    { title: "Paid", dataIndex: "paidAmount", key: "paidAmount", align: "right", width: 130, render: money },
    { title: "Due", dataIndex: "dueAmount", key: "dueAmount", align: "right", width: 120, render: (v) => <span className={`tabular-nums ${Number(v) > 0.009 ? "font-semibold text-red-700" : ""}`}>{formatMoney(v)}</span> },
    {
      title: "Payment Mode",
      key: "paymentMode",
      width: 150,
      render: (_, r) => [...new Set((r.payments || []).map((p) => p.paymentMode).filter(Boolean))].join(", ") || "-",
    },
  ];

  const purchaseColumns = [
    { title: "Date", dataIndex: "date", key: "date", width: 115, render: (v, r) => formatDate(v || r.purchaseDate || r.createdAt) || "-" },
    { title: "Invoice No", dataIndex: "invoiceNo", key: "invoiceNo", width: 170, render: (v) => v || "-" },
    { title: "Type", dataIndex: "purchaseType", key: "purchaseType", width: 130, render: (v, r) => (r.isOpeningStock ? "Opening Stock" : TYPE_LABEL[v] || v || "-") },
    { title: "Party / Customer", key: "party", width: 200, ellipsis: true, render: (_, r) => r.party?.name || r.customerName || "-" },
    { title: "Phone", key: "phone", width: 120, render: (_, r) => r.party?.phone || r.customerPhone || "-" },
    { title: "Pcs", key: "items", align: "center", width: 60, render: (_, r) => (r.items || []).reduce((t, i) => t + (i.pieces ?? 1), 0) },
    { title: "Net Wt (g)", key: "netWeight", align: "right", width: 100, render: (_, r) => <span className="tabular-nums">{formatWeight(netWeightOf(r))}</span> },
    { title: "Net Amount", key: "amount", align: "right", width: 140, render: (_, r) => money(r.netPayable ?? r.totalAmount ?? 0) },
    { title: "Paid", dataIndex: "paidAmount", key: "paid", align: "right", width: 130, render: money },
    // amount still owed — dueAmount (balanceAmount is the old-gold adjustment balance)
    { title: "Due", dataIndex: "dueAmount", key: "due", align: "right", width: 130, render: (v) => <span className={`tabular-nums ${Number(v) > 0.009 ? "font-semibold text-red-700" : ""}`}>{formatMoney(v)}</span> },
  ];

  return (
    <div className="w-full max-w-full overflow-x-auto">
      <Table
        size="small"
        rowKey={(r) => r.id || r.invoiceNo}
        columns={type === "sales" ? salesColumns : purchaseColumns}
        dataSource={data}
        loading={loading}
        scroll={{ x: "max-content" }}
        rowClassName={(r) => (r.status === "CANCELLED" ? "opacity-60" : "")}
        pagination={{ defaultPageSize: 20, showSizeChanger: true, pageSizeOptions: ["20", "50", "100", "200"], showTotal: (t, [a, b]) => `${a}–${b} of ${t}` }}
      />
    </div>
  );
};

export default ReportTable;
