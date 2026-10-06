import { cleanScannedCode } from "./config";

/*
 * Keyboard-wedge scanner detector.
 *
 * A HID scanner "types" the code as a burst of keystrokes a few milliseconds apart, usually followed
 * by Enter/Tab. Humans type 80-300 ms apart, so a burst is any run of printable keys whose gaps all
 * stay under interKeyTimeoutMs. A burst only counts as a scan when it reaches minLength and ends with
 * the configured terminator (or, with terminator "None", is followed by a pause).
 *
 * When the burst landed inside a text field, the field's value is restored to what it was before the
 * burst so the scanned characters do not pollute e.g. the customer name box.
 * Elements inside [data-scanner-ignore] are skipped entirely (they handle scans themselves).
 */

const isEditable = (el) => {
  if (!el || el === document.body) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === "TEXTAREA") return true;
  if (tag !== "INPUT") return false;
  const type = (el.type || "text").toLowerCase();
  return ["text", "search", "tel", "number", "email", "url", "password"].includes(type);
};

// React tracks input values through the native setter; going through it keeps controlled inputs in sync.
const restoreFieldValue = (el, value) => {
  if (!el || el.isContentEditable || typeof value !== "string") return;
  const proto = el.tagName === "TEXTAREA" ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  try {
    if (setter) setter.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
  } catch {
    /* number inputs reject partial strings; ignore */
  }
};

const TERMINATOR_KEYS = { Enter: ["Enter", "NumpadEnter"], Tab: ["Tab"] };

/**
 * @param {object} options
 * @param {() => object} options.getConfig  returns the current normalised BarcodeConfig
 * @param {(scan: {raw:string, code:string, durationMs:number, source:string}) => void} options.onScan
 * @param {(event: object) => void} [options.onDebug]  receives every keystroke / decision (Settings test panel)
 * @returns {() => void} detach function
 */
export function attachWedgeDetector({ getConfig, onScan, onDebug }) {
  let buffer = [];
  let lastTime = 0;
  let startTime = 0;
  let burstTarget = null;
  let targetValueBefore = null;
  let idleTimer = null;

  const reset = () => {
    buffer = [];
    lastTime = 0;
    startTime = 0;
    burstTarget = null;
    targetValueBefore = null;
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  };

  const finish = (reason) => {
    const cfg = getConfig();
    const raw = buffer.join("");
    const durationMs = Math.round(lastTime - startTime);
    const code = cleanScannedCode(raw, cfg);
    const accepted = code.length >= cfg.minLength && code.length <= cfg.maxLength;
    onDebug?.({ type: accepted ? "scan" : "rejected", raw, code, durationMs, reason, length: code.length });
    if (accepted) {
      if (burstTarget && isEditable(burstTarget)) restoreFieldValue(burstTarget, targetValueBefore);
      onScan({ raw, code, durationMs, source: "keyboard" });
    }
    reset();
    return accepted;
  };

  const handleKeyDown = (event) => {
    if (event.defaultPrevented && !buffer.length) return;
    if (event.ctrlKey || event.altKey || event.metaKey) return;
    if (event.repeat) {
      reset();
      return;
    }
    const target = event.target;
    if (target?.closest?.("[data-scanner-ignore]")) return;

    const cfg = getConfig();
    const now = performance.now();
    const gap = lastTime ? now - lastTime : 0;
    const terminatorKeys = TERMINATOR_KEYS[cfg.terminator] || [];

    if (terminatorKeys.includes(event.key)) {
      const isBurst = buffer.length > 0 && gap <= cfg.interKeyTimeoutMs * 2;
      onDebug?.({ type: "key", key: event.key, gap: Math.round(gap), terminator: true });
      if (isBurst && buffer.length >= cfg.minLength) {
        // Stop the Enter/Tab from submitting a form or moving focus.
        event.preventDefault();
        event.stopPropagation();
        finish(`terminator ${event.key}`);
      } else {
        if (buffer.length >= 2) onDebug?.({ type: "rejected", raw: buffer.join(""), reason: "too short or too slow" });
        reset();
      }
      return;
    }

    if (event.key.length !== 1) {
      // Shift etc. arrive between characters of a scan; anything else breaks the burst.
      if (event.key !== "Shift" && event.key !== "CapsLock") reset();
      return;
    }

    if (buffer.length && gap > cfg.interKeyTimeoutMs) {
      if (buffer.length >= 2) onDebug?.({ type: "rejected", raw: buffer.join(""), reason: `gap ${Math.round(gap)} ms > ${cfg.interKeyTimeoutMs} ms` });
      reset();
    }

    if (!buffer.length) {
      startTime = now;
      burstTarget = target;
      targetValueBefore = isEditable(target) && !target.isContentEditable ? target.value : null;
    }
    buffer.push(event.key);
    lastTime = now;
    onDebug?.({ type: "key", key: event.key, gap: Math.round(gap) });

    if (buffer.length > cfg.maxLength + (cfg.prefix?.length || 0) + (cfg.suffix?.length || 0)) {
      onDebug?.({ type: "rejected", raw: buffer.join(""), reason: "longer than maxLength" });
      reset();
      return;
    }

    if (cfg.terminator === "None") {
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idleTimer = null;
        if (buffer.length >= cfg.minLength) finish("pause");
        else reset();
      }, cfg.interKeyTimeoutMs * 3);
    }
  };

  window.addEventListener("keydown", handleKeyDown, true);
  return () => {
    window.removeEventListener("keydown", handleKeyDown, true);
    reset();
  };
}
