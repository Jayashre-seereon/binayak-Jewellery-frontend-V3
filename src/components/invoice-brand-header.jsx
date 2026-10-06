import React from "react";

const BRAND = {
  navy: "#1f2357",
  navyDeep: "#171a44",
  gold: "#c9a24a",
  goldLight: "#f3e2b0",
};

export default function InvoiceBrandHeader({ store }) {
  const storeName = String(store?.storeName || "BINAYAK JEWELLERS PATIA").toUpperCase();
  const branch = store?.tagline || "Patia Branch, Bhubaneswar";

  return (
    <div
      className="invoice-brand-header flex items-center relative overflow-hidden"
      style={{ minHeight: 96, background: BRAND.navy, color: "white" }}
    >
      <div style={{ width: 18, alignSelf: "stretch", background: BRAND.gold }} />
      <div
        className="invoice-brand-circle flex items-center justify-center shrink-0"
        style={{
          width: 48,
          height: 48,
          marginLeft: 12,
          borderRadius: "50%",
          background: "white",
          border: `2px solid ${BRAND.gold}`,
          color: BRAND.navyDeep,
          fontSize: 17,
          fontWeight: 800,
        }}
        aria-label="Binayak Jewellers logo"
      >
        <img src="/logo.png" alt="Binayak Jewellers" style={{ width: 36, height: 36, objectFit: "contain" }} />
      </div>
      <div className="min-w-0 ml-4">
        <div className="truncate text-base font-bold tracking-wide">{storeName}</div>
        <div className="text-[10px] italic text-[#f7e9c7]">{branch}</div>
      </div>
      <div
        className="invoice-since-badge flex flex-col items-center justify-center shrink-0"
        style={{
          width: 48,
          height: 48,
          marginLeft: "auto",
          marginRight: 12,
          borderRadius: "50%",
          background: "white",
          border: `2px solid ${BRAND.goldLight}`,
          color: BRAND.navyDeep,
          lineHeight: 1,
        }}
      >
        <span style={{ fontSize: 7, fontWeight: 800 }}>SINCE</span>
        <span style={{ fontSize: 12, fontWeight: 800, marginTop: 2 }}>2010</span>
        <span style={{ fontSize: 4.5, fontWeight: 800, marginTop: 2 }}>TRUSTED</span>
      </div>
      <div style={{ width: 18, alignSelf: "stretch", background: BRAND.gold }} />
    </div>
  );
}
