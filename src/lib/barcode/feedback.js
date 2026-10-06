let audioCtx = null;

/** Short confirmation beep via Web Audio (no asset needed). Errors are swallowed: sound is optional. */
export function playBeep({ frequency = 1760, durationMs = 90, volume = 0.15, type = "square" } = {}) {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx || new Ctx();
    if (audioCtx.state === "suspended") audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.value = volume;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    osc.start(now);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationMs / 1000);
    osc.stop(now + durationMs / 1000 + 0.02);
  } catch {
    /* sound is best effort */
  }
}

export const playErrorBeep = () => playBeep({ frequency: 220, durationMs: 220, type: "sawtooth" });

/** Opens a PDF/blob in a new tab; falls back to a download when pop-ups are blocked. */
export function openBlob(blob, filename = "document.pdf") {
  const url = window.URL.createObjectURL(blob);
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
  setTimeout(() => window.URL.revokeObjectURL(url), 60000);
}

/**
 * Decodes a barcode from an image file with the browser BarcodeDetector API (Chrome/Edge/Android).
 * Returns null when the API is unavailable so callers can fall back to manual entry.
 */
export async function decodeBarcodeFromImage(file) {
  if (typeof window === "undefined" || !("BarcodeDetector" in window)) return null;
  const supported = (await window.BarcodeDetector.getSupportedFormats?.()) || undefined;
  const detector = new window.BarcodeDetector(supported?.length ? { formats: supported } : undefined);
  const bitmap = await createImageBitmap(file);
  try {
    const results = await detector.detect(bitmap);
    return results?.[0]?.rawValue ? String(results[0].rawValue).trim() : "";
  } finally {
    bitmap.close?.();
  }
}

export const isBarcodeDetectorSupported = () => typeof window !== "undefined" && "BarcodeDetector" in window;
