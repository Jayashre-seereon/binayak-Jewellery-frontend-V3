import { cleanScannedCode } from "./config";

export const isSerialSupported = () => typeof navigator !== "undefined" && "serial" in navigator;

export const SERIAL_UNSUPPORTED_MESSAGE =
  "This browser does not support Web Serial. Use Chrome or Edge on desktop (over HTTPS), or switch the scanner to keyboard-wedge (HID) mode.";

/**
 * Opens a serial port and emits one scan per line (CR / LF separated).
 * @returns {Promise<{close: () => Promise<void>, info: object}>}
 */
export async function openSerialScanner({ port, config, onScan, onError, onDebug }) {
  if (!isSerialSupported()) throw new Error(SERIAL_UNSUPPORTED_MESSAGE);
  const selected = port || (await navigator.serial.requestPort());
  await selected.open({
    baudRate: Number(config.serialBaudRate) || 9600,
    dataBits: Number(config.serialDataBits) || 8,
    stopBits: Number(config.serialStopBits) || 1,
    parity: config.serialParity || "none",
  });

  let closed = false;
  let reader = null;
  const decoder = new TextDecoder();

  const loop = async () => {
    let pending = "";
    while (!closed && selected.readable) {
      reader = selected.readable.getReader();
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const parts = pending.split(/\r\n|\r|\n/);
          pending = parts.pop() ?? "";
          for (const raw of parts) {
            const code = cleanScannedCode(raw, config);
            onDebug?.({ type: "serial", raw, code });
            if (code.length >= config.minLength && code.length <= config.maxLength) {
              onScan({ raw, code, durationMs: 0, source: "serial" });
            }
          }
        }
      } catch (error) {
        if (!closed) onError?.(error);
      } finally {
        try {
          reader.releaseLock();
        } catch {
          /* already released */
        }
      }
    }
  };
  loop();

  return {
    info: selected.getInfo?.() || {},
    port: selected,
    close: async () => {
      closed = true;
      try {
        await reader?.cancel();
      } catch {
        /* ignore */
      }
      try {
        await selected.close();
      } catch {
        /* ignore */
      }
    },
  };
}

/** Ports the user already granted earlier (no picker needed). */
export async function getGrantedSerialPorts() {
  if (!isSerialSupported()) return [];
  try {
    return await navigator.serial.getPorts();
  } catch {
    return [];
  }
}
