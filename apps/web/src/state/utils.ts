import { UndoLimit } from "@vcell/engine";

export function safeRandomId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  const maybeUUID = c?.randomUUID;
  if (typeof maybeUUID === "function") return maybeUUID.call(c);

  if (c?.getRandomValues) {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function undoLimitToCap(undoLimit: UndoLimit): number {
  if (undoLimit === "unlimited") return Number.POSITIVE_INFINITY;
  return undoLimit;
}
