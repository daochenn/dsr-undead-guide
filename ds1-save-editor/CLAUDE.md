# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DS1 Save Editor — a multi-platform save file editor for Dark Souls Remastered (DS1/DSR) and Dark Souls 3 (DS3). Edits encrypted `.sl2` save files supporting character stats, inventory, appearance, bonfires, NPCs, bosses, and world events.

## Tech Stack

- **Frontend:** React 18.2 + TypeScript (strict, ES2020), Vite 5
- **Routing:** react-router-dom v7.10 (BrowserRouter for web, HashRouter for Electron/Tauri)
- **Desktop:** Electron 39 (primary), Tauri 2.9 (secondary)
- **Crypto:** Web Crypto API (AES-CBC) + js-md5 for checksums
- **No test framework or linter configured** — TypeScript strict mode is the primary type-checking tool

## Commands

```bash
npm install              # Install dependencies
npm run dev              # Vite dev server (localhost:5173)
npm run build            # Web build (absolute paths) + SEO page generation
npm run build:static     # Static build for Electron (relative paths)
npm run electron         # Build static + launch Electron
npm run electron:dev     # Launch Electron without rebuild
npm run electron:debug:dev  # Electron with devtools
npm run dist             # Package for current platform (electron-builder)
npm run dist:win         # Package for Windows
npm run tauri:dev        # Tauri dev mode (frontend + Rust)
npm run tauri:build      # Tauri production build
```

No test or lint commands exist. There is no ESLint or Prettier config.

## Architecture

### Multi-Game Structure

Each game has its own isolated app directory under `src/apps/` with independent lib, components, and hooks:
- `src/apps/ds1/` — Dark Souls Remastered (primary, full-featured)
- `src/apps/ds3/` — Dark Souls 3 (beta)
- `src/core/config.ts` — Game registry with metadata, used by the landing page selector

### Core Patterns

- **File System Adapter Pattern:** `src/apps/ds1/lib/adapters/` defines `IFileSystemAdapter` with `WebFSAdapter` (File System Access API + IndexedDB) and `TauriFSAdapter` (Tauri plugins). Factory in `adapters/index.ts` auto-detects environment. DS3 has a separate adapter singleton.
- **Custom Hooks:** Each game's main state lives in a single hook (`useDS1SaveEditor`, `useDS3SaveEditor`) that handles file loading, character selection, and save logic.
- **Platform Auto-Detection:** DS1 save files are auto-detected as PC, Nintendo Switch, or PS4 based on file size/filename. Each platform has its own `SaveFileEditor` variant.
- **Context Providers:** `GameContext` (selected game) and `LanguageContext` (en/zh, persisted to localStorage).

### Save File Format (DS1)

Encrypted with AES-CBC. 11 slots (10 characters + 1 settings). Slot size: `0x060030` bytes, base offset: `0x02C0`. File size: `0x4204D0` (PC), `0x4200A0` (Switch). AES key and constants in `src/apps/ds1/lib/constants.ts`. Character names are UTF-16 Little Endian.

### i18n

Custom system in `src/apps/ds1/lib/i18n.ts` (English + Chinese). Chinese item names loaded from `public/json/item_names_zh.json`. UI strings are keyed by `i18n()` calls throughout components.

## Key Files

| File | Role |
|------|------|
| `src/App.tsx` | Root — selects HashRouter (Electron/Tauri) or BrowserRouter (web) |
| `src/core/Router.tsx` | All route definitions |
| `src/apps/ds1/DS1App.tsx` | Main DS1 editor component |
| `src/apps/ds1/hooks/useDS1SaveEditor.ts` | DS1 state management hook |
| `src/apps/ds1/lib/SaveFileEditor.ts` | PC save file read/write (AES-CBC) |
| `src/apps/ds1/lib/Character.ts` | Character data model (stats, name, appearance, bonfires) |
| `src/apps/ds1/lib/Inventory.ts` | Inventory data model with item categories |
| `src/apps/ds1/lib/constants.ts` | Offsets, stat tables, AES key, class data |
| `src/apps/ds1/lib/crypto.ts` | AES-CBC encrypt/decrypt + MD5 |
| `src/apps/ds1/components/TabPanel.tsx` | 8-tab editing UI |
| `electron/main.js` | Electron main process |
| `src-tauri/src/lib.rs` | Tauri Rust backend |
| `scripts/generate-seo-pages.js` | Post-build SEO HTML generation |

## Build Modes

- `npm run build` → `dist/` with absolute paths (`/assets/...`) for Cloudflare Pages
- `npm run build:static` → `dist/` with relative paths (`./assets/...`) for Electron
- Vite config (`vite.config.ts`) switches `base` based on `--mode static`

## Distribution

- **Web:** Cloudflare Pages from `dist/`
- **Electron:** `electron-builder` outputs to `release/` (Windows portable/NSIS, Linux AppImage/deb, macOS dmg/zip)
- **Tauri:** Native binary via `src-tauri/`, requires Rust toolchain (min 1.77.2)
