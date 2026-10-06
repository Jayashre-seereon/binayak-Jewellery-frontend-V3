import { useEffect, useMemo, useState } from "react";
import { Search, Phone, RefreshCw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";
import { getCustomerHistory, lookupCustomerByPhone } from "@/api/customer-api";
import { notifyError } from "@/utils/notify";
import CustomerHistoryTracking from "@/features/sales/sale-estimate/customer-history-tracking";

const money = (value) => Math.round((Number(value || 0) + Number.EPSILON) * 100) / 100;

export default function CustomerHistoryPage() {
  const selectedStore = useAuthStore((state) => state.selectedStore);
  const storeId = selectedStore?.id || selectedStore?.storeId || localStorage.getItem("selectedStoreId");

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("logs");
  const [customer, setCustomer] = useState(null);
  const [availableAdvances, setAvailableAdvances] = useState([]);
  const [availableOldJewellery, setAvailableOldJewellery] = useState([]);
  const [allAdvancesHistory, setAllAdvancesHistory] = useState([]);
  const [allOldJewelleryHistory, setAllOldJewelleryHistory] = useState([]);
  const [adjustmentLogsHistory, setAdjustmentLogsHistory] = useState([]);
  const [pastSalesHistory, setPastSalesHistory] = useState([]);

  const canSearch = useMemo(() => String(phone || "").replace(/\D/g, "").length === 10, [phone]);

  const hydrateFromPayload = (payload, fallbackCustomer) => {
    const cust = payload?.customer || fallbackCustomer || null;
    setCustomer(cust);
    setAvailableAdvances(payload?.availableAdvances || []);
    setAvailableOldJewellery(payload?.availableOldJewellery || []);
    setAllAdvancesHistory(payload?.allAdvances || []);
    setAllOldJewelleryHistory(payload?.allOldJewellery || []);
    setAdjustmentLogsHistory(payload?.adjustmentLogs || []);
    setPastSalesHistory(payload?.pastSales || []);
  };

  const loadByPhone = async (rawPhone) => {
    const cleanPhone = String(rawPhone || "").replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      notifyError(null, "Please enter a valid 10 digit phone number.");
      return;
    }

    try {
      setLoading(true);
      const lookup = await lookupCustomerByPhone(cleanPhone, storeId);
      if (lookup?.success && (lookup?.customer?.id || lookup?.exists)) {
        hydrateFromPayload(lookup, lookup.customer);
        if (lookup?.customer?.phone) setPhone(String(lookup.customer.phone));
        return;
      }

      if (lookup?.customer?.id) {
        const history = await getCustomerHistory(lookup.customer.id, storeId);
        hydrateFromPayload(history, lookup.customer);
        return;
      }

      setCustomer(null);
      setAvailableAdvances([]);
      setAvailableOldJewellery([]);
      setAllAdvancesHistory([]);
      setAllOldJewelleryHistory([]);
      setAdjustmentLogsHistory([]);
      setPastSalesHistory([]);
      notifyError(null, "No customer history found for this phone number.");
    } catch (error) {
      notifyError(error, "Failed to load customer history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initialPhone = localStorage.getItem("customerHistoryPhone") || "";
    if (initialPhone) {
      setPhone(initialPhone);
      loadByPhone(initialPhone);
      localStorage.removeItem("customerHistoryPhone");
    }
  }, [storeId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Customer History</CardTitle>
          </div>
          <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </label>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter 10 digit phone number"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={() => loadByPhone(phone)} disabled={loading || !canSearch}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? "Loading..." : "Search"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPhone("");
                  setCustomer(null);
                  setAvailableAdvances([]);
                  setAvailableOldJewellery([]);
                  setAllAdvancesHistory([]);
                  setAllOldJewelleryHistory([]);
                  setAdjustmentLogsHistory([]);
                  setPastSalesHistory([]);
                  setActiveTab("logs");
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
          </div>
          <div className="text-sm text-slate-600">
            {customer ? (
              <>
                Customer: <strong>{customer.name || customer.customerName || "Customer"}</strong>{" "}
                {customer.phone ? `(${customer.phone})` : ""} | ID: #{customer.id || "-"}
              </>
            ) : (
              "Search a customer by phone number to load history."
            )}
          </div>
        </CardHeader>
      </Card>

      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <CustomerHistoryTracking
            customerName={customer?.name || customer?.customerName}
            customerPhone={customer?.phone || phone}
            customerId={customer?.id}
            availableAdvances={availableAdvances}
            availableOldJewellery={availableOldJewellery}
            allAdvancesHistory={allAdvancesHistory}
            allOldJewelleryHistory={allOldJewelleryHistory}
            adjustmentLogsHistory={adjustmentLogsHistory}
            pastSalesHistory={pastSalesHistory}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            formatMoney={money}
          />
        </CardContent>
      </Card>
    </div>
  );
}
