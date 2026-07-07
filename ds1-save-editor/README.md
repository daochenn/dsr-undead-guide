# DSR Undead Guide

A save file parser and player guidance tool for Dark Souls Remastered. Parse save data to analyze character status, track game progress, and provide intelligent guidance for players on their journey through Lordran.

**Discord:** https://discord.gg/sWyvvBzr5

---

## ✨ Key Features

### 📊 Save File Parsing
- Parse Dark Souls Remastered save files (.sl2) to extract character data
- Analyze character stats, souls, humanity, and level
- Track game progress (bosses defeated, bonfires unlocked, world events)
- Inventory analysis and item tracking

### 🗺️ Player Guidance
- **Progress Tracking** - See where you are in the game's main story
- **Area Recommendations** - Suggest optimal next areas based on your level and progress
- **Boss Preparation** - Analyze your build and suggest strategies for upcoming bosses
- **Item Location** - Find items you're missing based on your game state

### 🎮 Multi-Platform Support
- **Web Version** - Use directly in browser, no installation required
- **Electron Desktop** - Native app for Windows/Linux/macOS

### 🌍 Internationalization
- English and Chinese UI

---

## 🚀 Quick Start

### Option 1: Download Desktop App (Recommended)

Download for your platform:
- **Windows**: `DS1-Save-Editor-Setup.exe` or `DS1-Save-Editor-Portable.exe`
- **Linux**: `DS1-Save-Editor.AppImage` or `ds1-save-editor.deb`
- **macOS**: `DS1-Save-Editor.dmg`

Portable versions require no installation - just download and run!

### Option 2: Web Version

Visit the online version or run locally:

```bash
npm install
npm run dev
```

Then open http://localhost:5173

---

## 📖 User Guide

### First Time Use

#### Method A: Auto-Detect (Recommended)
1. Click **"Load Save File"** button
2. Select a folder containing saves (e.g., `NBGI`, `DARK SOULS REMASTERED`)
3. App automatically searches for `.sl2` files
4. Select the save file you want to edit

#### Method B: Manual Selection
1. Click **"Load Save File"** button
2. Navigate to save location:
   ```
   C:\Users\<YourUsername>\Documents\NBGI\DARK SOULS REMASTERED\<user_id>\
   ```
3. Select `DRAKS0005.sl2` file

### Subsequent Use

After page refresh, you'll see two buttons:

```
┌─────────────────────┐
│  Load Save File  │  ← Load a new file
│         ?         │
├─────────────────────┤
│ Load Last Save  │  ← Quick load last file
└─────────────────────┘
```

Click **"Load Last Save"**, then grant file access permission when prompted.

### Auto-Detect File Changes

If you're editing while playing the game, enable "Auto-detect":

1. After loading a save, click **"Auto-detect"** button in toolbar (enabled by default)
2. When the game saves, editor automatically detects changes and reloads
3. Seamlessly switch between game and editor

---

## 🎯 Features Overview

### General Tab
Edit core character attributes:
- **Stats** - VIT, ATN, END, STR, DEX, RES, INT, FTH
- **Level** - Soul Level, Souls, Humanity
- **Name** - Character name
- **Class** - Current class

### Inventory Tab
Manage character inventory:
- Weapons, Armor, Rings
- Consumables, Materials, Key Items
- Spells, Ammunition
- Create, edit, delete items
- Weapon Level calibration

### Appearance Tab
Modify character appearance:
- Physique, Hairstyle, Hair Color
- Eye Color
- Face Parameters (32 fine-tuned adjustments)
- Import/Export .dsrchr appearance presets

### Bonfires Tab
Unlock bonfires and warp points:
- View bonfire status
- One-click unlock all warpable bonfires

### NPCs/Bosses Tab
Manage NPC and Boss states:
- Search NPCs/Bosses
- Revive or kill NPCs
- Mark bosses as defeated

### World Events Tab
View and modify world event states

### Table Tab
Advanced user features:
- View raw hex data
- Search patterns
- Export slot data

---

## 🔧 Browser Compatibility

| Browser | File System Access API | Auto-Load | Auto-Detect Changes |
|---------|----------------------|-----------|---------------------|
| Chrome 86+ | ✅ Supported | ✅ Supported | ✅ Supported |
| Edge 86+ | ✅ Supported | ✅ Supported | ✅ Supported |
| Safari 15.2+ | ✅ Supported | ✅ Supported | ✅ Supported |
| Firefox | ❌ Not Supported | ⚠️ Manual Select | ❌ Not Supported |

**Notes**:
- Chrome/Edge/Safari support File System Access API for auto-load and file change detection
- Firefox doesn't support this API, requires manual file selection on each refresh
- App auto-detects browser support and gracefully degrades

---

## 🛠 Development Guide

### Prerequisites
- Node.js 16+
- npm or yarn

### Installation
```bash
npm install
```

### Development Commands
```bash
# Web development with hot reload
npm run dev              # → http://localhost:5173

# Build for web deployment (Cloudflare Pages, etc.)
npm run build            # → dist/ with absolute paths

# Build for Electron/local use
npm run build:static     # → dist/ with relative paths

# Electron development
npm run electron         # Build + run Electron app
npm run electron:dev     # Run Electron without rebuilding

# Distribution
npm run dist             # Package for current platform
npm run dist:win         # Windows
npm run dist:linux       # Linux
npm run dist:mac         # macOS

# Preview production build
npm run preview
```

### Build Outputs
- **Web build** (`npm run build`): `dist/` folder with absolute paths
- **Electron build** (`npm run dist`): `release/` folder with executables
- **Static build** (`npm run build:static`): `dist/` folder with relative paths

---

## 📁 Project Structure

```
ds1-save-editor/
├── src/
│   ├── apps/
│   │   ├── ds1/              # DS1 Editor (main features)
│   │   │   ├── components/   # UI components
│   │   │   ├── hooks/        # Custom React hooks
│   │   │   ├── lib/          # Core logic
│   │   │   └── DS1App.tsx    # Main component
│   │   └── ds3/              # DS3 Editor (beta)
│   ├── core/
│   │   ├── context/          # React Context
│   │   ├── config.ts         # Game configuration
│   │   └── Router.tsx        # Route definitions
│   ├── shared/               # Shared components and types
│   └── main.tsx              # Entry point
├── electron/                 # Electron main process
├── src-tauri/                # Tauri configuration
├── public/                   # Static assets
├── dist/                     # Build output (generated)
└── release/                  # Electron packaging output (generated)
```

---

## 🔐 Technical Details

### Save File Format
- Encrypted using AES-CBC encryption
- Each character slot stored separately with unique IV
- 11 total slots: 10 characters + 1 settings (hidden in UI)
- Character names stored as UTF-16 Little Endian

### Auto-Level Correction
When enabled (default), level is calculated as:
```
Level = Base Level + (Current Stats - Starting Stats)
```
Each class has predefined base stats and starting level.

### File System Access
- Uses File System Access API (`showOpenFilePicker()` / `showSaveFilePicker()`)
- Requires HTTPS in production (works on localhost HTTP)
- Gracefully falls back to traditional file input/download for unsupported browsers

---

## 🤝 Community & Support

**Discord:** https://discord.gg/sWyvvBzr5

**QQ&email**:1937959102@qq.com

- Bug reports
- Feature requests
- Questions & support
- Contributions

------

## ❤️Acknowledgements

**Piroshkiv** - For the original [DSRSave](https://github.com/Piroshkiv/DSRSave) project, for the generous permission to fork and modify, and for the invaluable help and support during my first project.

**Dark Souls Community** - Thank you to everyone who has helped me

---

## 📄 License

This project is for educational purposes only. Dark Souls is a trademark of FromSoftware and Bandai Namco.



