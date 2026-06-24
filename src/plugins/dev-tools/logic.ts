/**
 * Pure, dependency-free converters for the developer tools plugin.
 * Each throws an Error with a readable message on invalid input.
 */

export type DevMode = "csv2json" | "json2csv" | "format";

/** Parse CSV text into a matrix of cells (RFC 4180: quotes, escaped "", newlines). */
function parseCsv(text: string): string[][] {
  const s = text.replace(/\r\n?/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  row.push(field);
  rows.push(row);

  // Drop a single trailing empty row produced by a final newline.
  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") rows.pop();
  }
  return rows;
}

/** Coerce a CSV cell into a typed JSON value, but never lose precision/leading zeros. */
function coerce(v: string): string | number | boolean | null {
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v) && String(Number(v)) === v) return Number(v);
  return v;
}

/** CSV → pretty-printed JSON array (first row = headers). */
export function csvToJson(csv: string): string {
  const rows = parseCsv(csv.trim());
  if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === "")) {
    return "[]";
  }
  const headers = rows[0].map((h) => h.trim());
  const out = rows.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => {
      obj[h] = coerce(r[i] ?? "");
    });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}

/** Escape a single CSV cell. */
function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = "";
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** JSON (array of objects, or a single object) → CSV. */
export function jsonToCsv(json: string): string {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return "";

  // Union of keys, in first-seen order.
  const keys: string[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new Error("Expected an array of objects (or a single object).");
    }
    for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
  }
  if (keys.length === 0) throw new Error("No fields found in the JSON objects.");

  const lines = [keys.map(csvCell).join(",")];
  for (const row of arr) {
    lines.push(keys.map((k) => csvCell((row as Record<string, unknown>)[k])).join(","));
  }
  return lines.join("\n");
}

/** Beautify (2-space) or minify JSON, validating it. */
export function formatJson(json: string, minify: boolean): string {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  return minify ? JSON.stringify(data) : JSON.stringify(data, null, 2);
}

export const SAMPLES: Record<DevMode, string> = {
  csv2json: "name,age,active\nAlice,30,true\nBob,25,false\n\"Carol, Jr.\",41,true",
  json2csv: '[\n  { "name": "Alice", "age": 30, "active": true },\n  { "name": "Bob", "age": 25, "active": false }\n]',
  format: '{"name":"Alice","age":30,"tags":["a","b"],"meta":{"active":true}}',
};
