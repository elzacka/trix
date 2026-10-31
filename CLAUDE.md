# Trix

Portable Tauri 2 app (Windows, macOS): Hurtigtaster and Jukselapp from Markdown files next to the app. Overview: `README.md`.

- Verify: `npm test`, then `npm run build:mac` and open the app. Windows: CI only (`build.yml`, which also builds macOS), no device here.
- Version: `src-tauri/Cargo.toml`; Tauri reads it.
- Frontend: plain ES modules in `ui/`, no bundler, no npm runtime dependencies. Parsers in `ui/parse.js`, pure, tested with `node --test`.
- Files are the user's: Trix writes them only when missing (`seed/`) and on «Lagre» in the editor; `save` refuses when the file changed on disk since it was read. Import opens its result in the editor; export copies to Downloads, never over a file.
- System list (`system.rs`), read only when the menu shows it: macOS reads System Settings' own table and Norwegian names (`KeyboardSettings.appex`), the user's `com.apple.symbolichotkeys` and App Shortcuts via `defaults`/`plutil`; Windows is `system/Windows.md`, verified against Microsoft's nb-no pages.
- The data folder is the app's folder (`data_dir` in `main.rs`); `TRIX_DATA_DIR` overrides it. A translocated macOS app stops with a message instead.
- Lookup matches the shown lists and Trix's own hotkey only. Combos compare by `comboId` (`ui/parse.js`).
- Window: borderless panel placed at the tray icon (`place`), hides on blur. Built in `build_panel`, not by config: links that would open in it go to the browser. macOS corners: public AppKit layer API (`round_corners`), not Tauri's private-API flag.
- Icons: Tabler, inline SVG, only where a word does not fit. App icon: `assets/icon.svg` → `npx tauri icon`.
- No network. UI strings Norwegian Bokmål, inline. No guidance text in the UI; format help lives in each file's top comment.
- No `PERSONVERN.md` until elzacka asks for it.
