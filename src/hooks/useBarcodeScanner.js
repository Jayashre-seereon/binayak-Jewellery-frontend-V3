import { useCallback, useEffect, useRef, useState } from "react";
import { getBarcodeConfig, subscribeBarcodeConfig } from "@/api/barcode-api";
import { DEFAULT_BARCODE_CONFIG, normalizeBarcodeConfig } from "@/lib/barcode/config";
import { attachWedgeDetector } from "@/lib/barcode/wedge-detector";
import {
  getGrantedSerialPorts,
  isSerialSupported,
  openSerialScanner,
  SERIAL_UNSUPPORTED_MESSAGE,
} from "@/lib/barcode/serial";

/**
 * Listens for barcode scans anywhere on the page.
 *
 * KEYBOARD_WEDGE: a global keydown detector separates scanner bursts from human typing (works with no
 * input focused). SERIAL: reads lines from a Web Serial port (call connectSerial() from a click once;
 * previously granted ports reconnect automatically).
 *
 * @param {object}   options
 * @param {Function} options.onScan        ({ raw, code, source, at, durationMs }) => void
 * @param {boolean}  [options.enabled=true]
 * @param {object}   [options.configOverride]  merged over the server config (Settings test panel)
 * @param {Function} [options.onDebug]      raw keystroke / decision stream
 */
export default function useBarcodeScanner({ onScan, enabled = true, configOverride, onDebug } = {}) {
  const [config, setConfig] = useState(DEFAULT_BARCODE_CONFIG);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [serialState, setSerialState] = useState({ connected: false, connecting: false, error: null, info: null });

  const onScanRef = useRef(onScan);
  const onDebugRef = useRef(onDebug);
  const serialRef = useRef(null);
  const effectiveConfig = configOverride ? normalizeBarcodeConfig({ ...config, ...configOverride }) : config;
  const configRef = useRef(effectiveConfig);

  useEffect(() => {
    onScanRef.current = onScan;
    onDebugRef.current = onDebug;
    configRef.current = effectiveConfig;
  });

  useEffect(() => {
    let alive = true;
    getBarcodeConfig()
      .then((cfg) => {
        if (alive) setConfig(cfg);
      })
      .catch(() => {
        /* defaults stay in effect; Settings page surfaces the error */
      })
      .finally(() => {
        if (alive) setConfigLoaded(true);
      });
    const unsubscribe = subscribeBarcodeConfig((cfg) => setConfig(cfg));
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  const emit = useCallback((scan) => {
    const enriched = { ...scan, at: Date.now() };
    setLastScan(enriched);
    onScanRef.current?.(enriched);
  }, [onScanRef, setLastScan]);

  // Keyboard wedge listener. The detector reads config through a ref so it never needs re-attaching.
  const deviceMode = effectiveConfig.deviceMode;
  useEffect(() => {
    if (!enabled || deviceMode !== "KEYBOARD_WEDGE") return undefined;
    return attachWedgeDetector({
      getConfig: () => configRef.current,
      onScan: emit,
      onDebug: (evt) => onDebugRef.current?.(evt),
    });
  }, [enabled, deviceMode, emit]);

  const disconnectSerial = useCallback(async () => {
    const current = serialRef.current;
    serialRef.current = null;
    if (current) await current.close();
    setSerialState({ connected: false, connecting: false, error: null, info: null });
  }, [serialRef, setSerialState]);

  const connectSerial = useCallback(
    async (port) => {
      if (!isSerialSupported()) {
        setSerialState((s) => ({ ...s, error: SERIAL_UNSUPPORTED_MESSAGE }));
        return false;
      }
      if (serialRef.current) await serialRef.current.close();
      serialRef.current = null;
      setSerialState({ connected: false, connecting: true, error: null, info: null });
      try {
        const handle = await openSerialScanner({
          port,
          config: configRef.current,
          onScan: emit,
          onDebug: (evt) => onDebugRef.current?.(evt),
          onError: (error) =>
            setSerialState({ connected: false, connecting: false, error: error?.message || "Serial device disconnected.", info: null }),
        });
        serialRef.current = handle;
        setSerialState({ connected: true, connecting: false, error: null, info: handle.info });
        return true;
      } catch (error) {
        const cancelled = error?.name === "NotFoundError";
        setSerialState({
          connected: false,
          connecting: false,
          error: cancelled ? null : error?.message || "Could not open the serial device.",
          info: null,
        });
        return false;
      }
    },
    [emit, serialRef, configRef, onDebugRef, setSerialState]
  );

  // SERIAL mode: silently reconnect to a port the user granted before.
  useEffect(() => {
    if (!enabled || deviceMode !== "SERIAL" || !isSerialSupported()) return undefined;
    let cancelled = false;
    getGrantedSerialPorts().then((ports) => {
      if (!cancelled && ports.length && !serialRef.current) connectSerial(ports[0]);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, deviceMode, connectSerial]);

  useEffect(
    () => () => {
      serialRef.current?.close();
      serialRef.current = null;
    },
    []
  );

  let status;
  if (!enabled) status = "disabled";
  else if (deviceMode === "SERIAL") {
    if (!isSerialSupported()) status = "unsupported";
    else if (serialState.connecting) status = "connecting";
    else if (serialState.connected) status = "connected";
    else if (serialState.error) status = "error";
    else status = "disconnected";
  } else status = "listening";

  const statusMessage =
    status === "unsupported"
      ? SERIAL_UNSUPPORTED_MESSAGE
      : status === "error"
        ? serialState.error
        : status === "connected"
          ? "Serial scanner connected"
          : status === "disconnected"
            ? "Serial scanner not connected"
            : status === "connecting"
              ? "Connecting to serial scanner…"
              : status === "listening"
                ? "Scanner ready"
                : "Scanner paused";

  return {
    lastScan,
    status,
    statusMessage,
    config: effectiveConfig,
    configLoaded,
    connectSerial,
    disconnectSerial,
    serialSupported: isSerialSupported(),
    serialInfo: serialState.info,
  };
}
