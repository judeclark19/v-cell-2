function exportLocalStorageToJson(filename = "vcell-localStorage-export.json") {
  const raw = Object.fromEntries(Object.keys(localStorage).map(k => [k, localStorage.getItem(k)]));

  // Attempt to JSON-parse values that look like JSON.
  const parsed = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") {
      const t = v.trim();
      if ((t.startsWith("{") && t.endsWith("}")) || (t.startsWith("[") && t.endsWith("]"))) {
        try { parsed[k] = JSON.parse(v); continue; } catch {}
      }
    }
    parsed[k] = v;
  }

  const exportObj = {
    app: "vcell",
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    data: parsed,
  };

  const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

exportLocalStorageToJson();