#!/usr/bin/env node
/**
 * Post-build step: precache the whole static export for offline.
 *
 * Walks `out/`, builds the list of URLs the app actually requests (HTML pages
 * as clean directory URLs, plus every asset / RSC .txt by literal path), and
 * injects that list + a content hash into `out/sw.js` (replacing the
 * placeholders in public/sw.js). Run automatically after `next build`.
 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { createHash } from "node:crypto";

const OUT = join(process.cwd(), "out");

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((e) => {
      const full = join(dir, e.name);
      return e.isDirectory() ? walk(full) : Promise.resolve([full]);
    }),
  );
  return files.flat();
}

const files = await walk(OUT);
const urls = new Set();

for (const file of files) {
  const rel = relative(OUT, file).split("\\").join("/");
  if (rel === "sw.js") continue; // never precache the SW itself

  urls.add("/" + rel); // literal path (assets, .txt, 404.html, …)

  if (rel === "index.html") {
    urls.add("/");
  } else if (rel.endsWith("/index.html")) {
    urls.add("/" + rel.slice(0, -"index.html".length)); // clean dir URL e.g. /p/tic-tac-toe/
  }
}

const list = [...urls].sort();
const hash = createHash("sha1").update(list.join("\n")).digest("hex").slice(0, 12);

const swPath = join(OUT, "sw.js");
let sw = await readFile(swPath, "utf8");
sw = sw.replace("__BUILD_ID__", hash);
sw = sw.replace("const PRECACHE_ASSETS = [];", `const PRECACHE_ASSETS = ${JSON.stringify(list)};`);
await writeFile(swPath, sw);

console.log(`✓ sw.js: precached ${list.length} URLs (cache quy-toolkit-${hash})`);
