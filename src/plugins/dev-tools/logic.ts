/**
 * Pure, dependency-free converters for the developer tools plugin.
 * hashText() uses the Web Crypto API (async, HTTPS only).
 * Every sync function throws an Error with a readable message on bad input.
 */

export type DevMode =
  | "csv2json"
  | "json2csv"
  | "format"
  | "json2ts"
  | "base64"
  | "urlencode"
  | "jwt"
  | "timestamp"
  | "hash";

export type Direction = "encode" | "decode";
export type HashAlgorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512";

// ─── CSV ─────────────────────────────────────────────────────────────────────

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
        if (s[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  row.push(field);
  rows.push(row);
  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") rows.pop();
  }
  return rows;
}

function coerce(v: string): string | number | boolean | null {
  if (v === "") return "";
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null") return null;
  if (/^-?\d+(\.\d+)?$/.test(v) && String(Number(v)) === v) return Number(v);
  return v;
}

export function csvToJson(csv: string): string {
  const rows = parseCsv(csv.trim());
  if (rows.length === 0 || (rows.length === 1 && rows[0].length === 1 && rows[0][0] === "")) return "[]";
  const headers = rows[0].map((h) => h.trim());
  const out = rows.slice(1).map((r) => {
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = coerce(r[i] ?? ""); });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}

function csvCell(value: unknown): string {
  let s: string;
  if (value === null || value === undefined) s = "";
  else if (typeof value === "object") s = JSON.stringify(value);
  else s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function jsonToCsv(json: string): string {
  let data: unknown;
  try { data = JSON.parse(json); } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const arr = Array.isArray(data) ? data : [data];
  if (arr.length === 0) return "";
  const keys: string[] = [];
  for (const row of arr) {
    if (!row || typeof row !== "object" || Array.isArray(row))
      throw new Error("Expected an array of objects (or a single object).");
    for (const k of Object.keys(row)) if (!keys.includes(k)) keys.push(k);
  }
  if (keys.length === 0) throw new Error("No fields found in the JSON objects.");
  const lines = [keys.map(csvCell).join(",")];
  for (const row of arr) lines.push(keys.map((k) => csvCell((row as Record<string, unknown>)[k])).join(","));
  return lines.join("\n");
}

export function formatJson(json: string, minify: boolean): string {
  let data: unknown;
  try { data = JSON.parse(json); } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  return minify ? JSON.stringify(data) : JSON.stringify(data, null, 2);
}

// ─── Base64 ───────────────────────────────────────────────────────────────────

export function base64Encode(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function base64Decode(b64: string): string {
  let bin: string;
  try { bin = atob(b64.trim()); } catch {
    throw new Error("Invalid Base64 string.");
  }
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

// ─── URL encode / decode ──────────────────────────────────────────────────────

export function urlEncode(text: string): string {
  return encodeURIComponent(text);
}

export function urlDecode(text: string): string {
  try { return decodeURIComponent(text.trim()); } catch {
    throw new Error("Invalid URL-encoded string.");
  }
}

// ─── JWT decode ───────────────────────────────────────────────────────────────

export function jwtDecode(token: string): string {
  const parts = token.trim().split(".");
  if (parts.length < 2 || parts.length > 3)
    throw new Error('Invalid JWT: expected 2–3 segments separated by "."');

  function decodeSegment(seg: string): unknown {
    const b64 = seg.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(seg.length / 4) * 4, "=");
    let bin: string;
    try { bin = atob(b64); } catch { throw new Error("Invalid base64url segment."); }
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const text = new TextDecoder().decode(bytes);
    try { return JSON.parse(text); } catch { return text; }
  }

  return JSON.stringify(
    { header: decodeSegment(parts[0]), payload: decodeSegment(parts[1]), signature: parts[2] ?? null },
    null, 2,
  );
}

// ─── JSON → TypeScript types ──────────────────────────────────────────────────

function cap(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function elemNameFor(field: string): string {
  const l = field.toLowerCase();
  if (l.endsWith("ies") && field.length >= 5) return cap(field.slice(0, -3) + "y");
  if (l.endsWith("s") && !l.endsWith("ss") && field.length >= 4) return cap(field.slice(0, -1));
  return cap(field) + "Item";
}

function inferTsType(value: unknown, fieldName: string, defs: Map<string, string>): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "string") return "string";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const sample = value.find((v) => v !== null && v !== undefined) ?? value[0];
    return `${inferTsType(sample, elemNameFor(fieldName), defs)}[]`;
  }
  if (typeof value === "object") {
    const typeName = cap(fieldName);
    if (!defs.has(typeName)) {
      // Reserve slot before recursing to handle any future self-ref
      defs.set(typeName, "");
      const fields = Object.entries(value as Record<string, unknown>).map(([k, v]) =>
        `  ${k}: ${inferTsType(v, k, defs)};`,
      );
      defs.set(typeName, `interface ${typeName} {\n${fields.join("\n")}\n}`);
    }
    return typeName;
  }
  return "unknown";
}

export function jsonToTs(json: string): string {
  let data: unknown;
  try { data = JSON.parse(json); } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }
  const defs = new Map<string, string>();
  const rootType = inferTsType(data, "Root", defs);
  const lines = [...defs.values()].filter(Boolean);
  if (!defs.has(rootType)) lines.push(`type Root = ${rootType};`);
  return lines.length ? lines.join("\n\n") : `type Root = ${rootType};`;
}

// ─── Timestamp ────────────────────────────────────────────────────────────────

export function convertTimestamp(input: string): string {
  const s = input.trim();
  let ms: number;
  if (/^\d{10}$/.test(s)) {
    ms = parseInt(s) * 1000;
  } else if (/^\d{13}$/.test(s)) {
    ms = parseInt(s);
  } else {
    const d = new Date(s);
    if (isNaN(d.getTime())) throw new Error("Cannot parse as a timestamp or date string.");
    ms = d.getTime();
  }
  const d = new Date(ms);
  return [
    `ISO 8601:   ${d.toISOString()}`,
    `UTC:        ${d.toUTCString()}`,
    `Local:      ${d.toLocaleString()}`,
    `Unix (s):   ${Math.floor(ms / 1000)}`,
    `Unix (ms):  ${ms}`,
  ].join("\n");
}

// ─── Hash (async, Web Crypto) ─────────────────────────────────────────────────

export async function hashText(text: string, algorithm: HashAlgorithm): Promise<string> {
  if (!crypto?.subtle) throw new Error("Web Crypto API is unavailable (requires HTTPS).");
  const buf = await crypto.subtle.digest(algorithm, new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ─── Samples ──────────────────────────────────────────────────────────────────

export const SAMPLES: Record<DevMode, string> = {
  csv2json: `name,age,active\nAlice,30,true\nBob,25,false\n"Carol, Jr.",41,true`,
  json2csv: `[\n  { "name": "Alice", "age": 30, "active": true },\n  { "name": "Bob", "age": 25, "active": false }\n]`,
  format: `{"name":"Alice","age":30,"tags":["a","b"],"meta":{"active":true}}`,
  json2ts: `{\n  "id": 1,\n  "name": "Alice",\n  "active": true,\n  "score": 9.5,\n  "address": { "city": "Hanoi", "zip": "100000" },\n  "tags": ["dev", "admin"]\n}`,
  base64: `Hello, World! 🌍`,
  urlencode: `https://example.com/search?q=xin chào&lang=vi`,
  jwt: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c`,
  timestamp: `1700000000`,
  hash: `Hello, World!`,
};
