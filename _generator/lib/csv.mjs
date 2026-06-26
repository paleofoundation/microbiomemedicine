// Minimal RFC-4180-ish CSV parser: handles quoted fields containing commas, quotes,
// and newlines (the studies/experiments CSVs have multi-line abstracts & definitions).

export function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQ = false, i = 0;
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
        inQ = false; i++; continue;
      }
      field += c; i++; continue;
    }
    if (c === '"') { inQ = true; i++; continue; }
    if (c === ",") { row.push(field); field = ""; i++; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
    field += c; i++;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}

export function parseCsvObjects(text) {
  const rows = parseCsv(text).filter((r) => !(r.length === 1 && r[0] === ""));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? "").trim(); });
    return o;
  });
}
