import { useEffect, useState } from "react";
import { getBarcodeImageBlob } from "@/api/barcode-api";

/**
 * Renders GET /api/barcode/image/:code. The endpoint needs the auth header, so the PNG is fetched as
 * a blob instead of being used directly as <img src>.
 */
export default function BarcodeImage({ code, symbology, height = 12, scale = 2, includeText = 1, className = "", alt }) {
  const [result, setResult] = useState({ key: null, url: null, failed: false });
  const key = code ? `${code}|${symbology || ""}|${height}|${scale}|${includeText}` : null;

  useEffect(() => {
    if (!key) return undefined;
    let alive = true;
    let objectUrl = null;
    getBarcodeImageBlob(code, { symbology, height, scale, includeText })
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setResult({ key, url: objectUrl, failed: false });
      })
      .catch(() => {
        if (alive) setResult({ key, url: null, failed: true });
      });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [key, code, symbology, height, scale, includeText]);

  if (!code) return <span className="text-xs text-slate-400">—</span>;
  const current = result.key === key ? result : { url: null, failed: false };
  if (current.failed) return <span className="font-mono text-[11px] text-slate-600">{code}</span>;
  if (!current.url) return <span className="inline-block h-8 w-24 animate-pulse rounded bg-slate-100" />;
  return <img src={current.url} alt={alt || `Barcode ${code}`} className={`max-w-full bg-white ${className}`} />;
}
