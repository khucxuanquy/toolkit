# Quy's Toolkit — Tools & Mini-Games

**Quy's** personal collection of handy tools and mini-games — built for me and
my family, hosted at [quy.io.vn](https://quy.io.vn).

A fast, installable Progressive Web App. Most tools run **client-side** with all
data stored locally on your device, and the app is installable and works offline
for everything you've already opened (some future tools may use the internet).

Built as an extensible **plugin platform**: adding a new tool or game is a
matter of dropping in a folder and adding one import line (or running a
generator script).

---

## ✨ Features

- **Offline-first PWA** — installable on desktop & mobile, works with no internet.
- **Bilingual UI** — Vietnamese (default) and English, switchable from the navbar
  and persisted; plugin names/descriptions are localized too.
- **Plugin architecture** — every tool/game is a self-contained plugin; the home
  dashboard renders from a registry (no hardcoded cards).
- **Lazy-loaded plugins** — plugin code is fetched only when opened, keeping the
  initial bundle small.
- **Local persistence** — IndexedDB (via Dexie) with strict per-plugin namespacing.
- **Light / dark theme** with no-flash hydration and persistence.
- **Favorites & recently-used** tracking, search, and category grouping.
- **Reusable UI library** — Button, Card, Modal, Dialog, Input, SearchBar, Toast,
  Tabs, Dropdown, ThemeToggle, LanguageToggle.

### Included plugins

| Plugin                   | Highlights                                                                                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tic Tac Toe Infinity** | 2-player twist where every mark carries a countdown ring and **disappears after a few seconds** (2–10s slider); flickers before vanishing, winning-line highlight, persistent scores. |
| **Wheel Spinner**        | Canvas wheel with smooth animation, weighted entries, sound effects, winner popup, save/import/export presets, "remove winner after spin".                                     |

---

## 🚀 Getting started

**Requirements:** Node.js **20+** and npm.

```bash
# install dependencies
npm install

# start the dev server
npm run dev
# → http://localhost:3000
```

### Other scripts

```bash
npm run build         # production build
npm run start         # serve the production build
npm run type-check    # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write .
npm run create-plugin # scaffold a new plugin (see below)
```

### Installing as an app (PWA)

The service worker only registers in a **production** build:

```bash
npm run build && npm run start
```

Open the app in Chrome/Edge and use the install icon in the address bar (or the
in-app "Install Quy's Toolkit" prompt). Once installed it launches in its own
window and works offline — any tool you've opened is cached and available with
no connection.

---

## 🏗️ Architecture

```text
src/
├── app/                      # Next.js App Router (layout, home, /p/[pluginId], manifest, offline)
├── core/
│   ├── plugin-system/        # definePlugin() — wraps a plugin in next/dynamic for lazy loading
│   ├── registry/             # registerPlugin / getPlugin / getAllPlugins + register-plugins barrel
│   ├── storage/              # Dexie database + namespaced saveData/loadData/removeData
│   ├── theme/                # theme store (zustand + localStorage) + no-flash init script
│   └── services/             # platform store (favorites/recents), dashboard UI, PwaManager
├── plugins/
│   ├── tic-tac-toe/          # one self-contained plugin per folder
│   └── wheel-spinner/
├── shared/
│   ├── components/           # Navbar, Dashboard, PluginCard, PluginHost
│   ├── hooks/                # useMounted, …
│   ├── ui/                   # reusable component library
│   ├── utils/                # cn(), …
│   └── types/                # PlatformPlugin interface
└── styles/                   # Tailwind v4 globals + design tokens
```

### Plugin contract

```ts
interface PlatformPlugin {
  id: string; // unique; also the storage namespace
  name: string;
  description: string;
  category: "Games" | "Utilities" | "Productivity" | "Generators";
  icon: string; // lucide icon name
  route: string; // conventionally /p/{id}
  tags?: string[];
  enabled?: boolean;
  component: React.ComponentType; // lazily loaded via next/dynamic
}
```

A plugin folder contains:

```text
plugins/<id>/
├── manifest.ts     # metadata (PluginManifest)
├── index.ts        # definePlugin(manifest, () => import("./page")) + registerPlugin(...)
├── storage.ts      # createNamespace("<id>") — isolated persistence
├── page.tsx        # the plugin UI (default export)
└── components/     # plugin-local components
```

### Local persistence

All data is stored in a single IndexedDB database under a per-plugin namespace,
so one plugin can never overwrite another's data:

```ts
import { createNamespace } from "@/core/storage/storage";
const store = createNamespace("my-plugin");

await store.save("scores", { wins: 3 });
const scores = await store.load("scores", { wins: 0 }); // typed, with fallback
await store.remove("scores");
```

### PWA / offline strategy

Because Next.js 16 uses **Turbopack** (which doesn't run webpack-based PWA
plugins like `next-pwa`), the service worker is **hand-written** (`public/sw.js`):

- **Navigations** → network-first, falling back to the cached page, then `/offline`.
- **Static assets** (`_next`, icons, scripts, styles, fonts) → stale-while-revalidate.

The web app manifest is generated by `src/app/manifest.ts` (served at
`/manifest.webmanifest`).

---

## ➕ Adding a new plugin

The fastest way:

```bash
npm run create-plugin
# answer the prompts (id, name, description, category, icon)
# …or pass them inline:
npm run create-plugin -- dice-roller "Dice Roller" "Roll some dice" Games Dices
```

This scaffolds `src/plugins/<id>/` and **auto-registers** it in
`src/core/registry/register-plugins.ts`. Edit the generated `page.tsx` and it
appears on the dashboard automatically — no other changes needed.

The architecture is ready for future plugins such as Sudoku, Minesweeper, Snake,
Tetris, Calculator, Stopwatch, Pomodoro, Notes, QR Generator, Password
Generator, and more.

---

## 🧰 Tech stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 · Zustand · Dexie
(IndexedDB) · Framer Motion · React Hook Form · Zod · ESLint · Prettier.
