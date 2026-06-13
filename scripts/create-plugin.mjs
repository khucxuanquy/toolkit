#!/usr/bin/env node
/**
 * Scaffolds a new plugin under src/plugins/<id> and registers it.
 *
 * Usage:
 *   npm run create-plugin                # interactive
 *   npm run create-plugin -- my-tool "My Tool" "Does a thing" Utilities Calculator
 */
import { mkdir, writeFile, readFile, access } from "node:fs/promises";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGINS_DIR = join(ROOT, "src", "plugins");
const REGISTER_FILE = join(ROOT, "src", "core", "registry", "register-plugins.ts");

const CATEGORIES = ["Games", "Utilities", "Productivity", "Generators"];

const toPascal = (id) =>
  id
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s[0].toUpperCase() + s.slice(1))
    .join("");

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

async function prompt() {
  const args = process.argv.slice(2);
  if (args.length >= 4) {
    return {
      id: args[0],
      name: args[1],
      description: args[2],
      category: args[3],
      icon: args[4] || "Sparkles",
    };
  }
  const rl = createInterface({ input: stdin, output: stdout });
  const id = (await rl.question("Plugin id (kebab-case, e.g. dice-roller): ")).trim();
  const name = (await rl.question("Display name: ")).trim();
  const description = (await rl.question("Short description: ")).trim();
  const category =
    (await rl.question(`Category [${CATEGORIES.join(" | ")}]: `)).trim() || "Utilities";
  const icon = (await rl.question("lucide icon name [Sparkles]: ")).trim() || "Sparkles";
  rl.close();
  return { id, name, description, category, icon };
}

const manifestTpl = ({
  id,
  name,
  description,
  category,
  icon,
}) => `import type { PluginManifest } from "@/shared/types/plugin";

export const manifest: PluginManifest = {
  id: "${id}",
  name: "${name}",
  description: "${description}",
  category: "${category}",
  icon: "${icon}",
  route: "/p/${id}",
  tags: [],
};
`;

const indexTpl = () => `import { definePlugin } from "@/core/plugin-system/define-plugin";
import { registerPlugin } from "@/core/registry/registry";
import { manifest } from "./manifest";

export const plugin = definePlugin(manifest, () => import("./page"));

registerPlugin(plugin);
`;

const storageTpl = ({ id }) => `import { createNamespace } from "@/core/storage/storage";

/** Isolated storage for this plugin only. */
export const storage = createNamespace("${id}");
`;

const pageTpl = ({ name }) => `"use client";

export default function ${"Page"}() {
  return (
    <div className="py-10 text-center text-muted">${name} — start building here.</div>
  );
}
`;

async function registerInBarrel(id) {
  const content = await readFile(REGISTER_FILE, "utf8");
  const importLine = `import "@/plugins/${id}";`;
  if (content.includes(importLine)) return;
  // Insert after the last existing plugin import.
  const lines = content.split("\n");
  let lastImport = -1;
  lines.forEach((l, i) => {
    if (l.startsWith('import "@/plugins/')) lastImport = i;
  });
  if (lastImport >= 0) lines.splice(lastImport + 1, 0, importLine);
  else lines.unshift(importLine);
  await writeFile(REGISTER_FILE, lines.join("\n"));
}

async function main() {
  const cfg = await prompt();
  if (!cfg.id || !/^[a-z0-9-]+$/.test(cfg.id)) {
    console.error("✗ Invalid id. Use lowercase letters, numbers and dashes.");
    process.exit(1);
  }
  const dir = join(PLUGINS_DIR, cfg.id);
  if (await exists(dir)) {
    console.error(`✗ Plugin "${cfg.id}" already exists.`);
    process.exit(1);
  }

  await mkdir(join(dir, "components"), { recursive: true });
  await writeFile(join(dir, "manifest.ts"), manifestTpl(cfg));
  await writeFile(join(dir, "index.ts"), indexTpl());
  await writeFile(join(dir, "storage.ts"), storageTpl(cfg));
  await writeFile(join(dir, "page.tsx"), pageTpl(cfg));
  await writeFile(join(dir, "components", ".gitkeep"), "");
  await registerInBarrel(cfg.id);

  console.log(`\n✓ Created src/plugins/${cfg.id}/`);
  console.log(`  • manifest.ts, index.ts, storage.ts, page.tsx, components/`);
  console.log(`✓ Registered in register-plugins.ts`);
  console.log(`\nNext: edit src/plugins/${cfg.id}/page.tsx (${toPascal(cfg.id)}).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
