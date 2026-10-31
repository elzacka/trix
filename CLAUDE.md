# Trix

Tauri 2 tray app (Windows, macOS): Hurtigtaster and Jukselapp from Markdown files in the user's app data folder. Overview: `README.md`.

- Verify: `npm test`, then `npm run build:mac` (also runs `cargo test`) and open the app. Windows: CI only (`build.yml`, which also builds macOS), no device here.
- Version: `src-tauri/Cargo.toml`; Tauri reads it.
- Frontend: plain ES modules in `ui/`, no bundler, no npm runtime dependencies. Parsers in `ui/parse.js`, pure, tested with `node --test`.
- Files are the user's: Trix writes them only when missing (`seed/`) and on «Lagre» in the editor; `save` refuses when the file changed on disk since it was read. Import opens its result in the editor; export copies to Downloads, never over a file.
- System list (`system.rs`), read only when the menu shows it: macOS reads System Settings' own table and Norwegian names (`KeyboardSettings.appex`), the user's `com.apple.symbolichotkeys` and App Shortcuts via `defaults`/`plutil`; Windows is `system/Windows.md`, verified against Microsoft's nb-no pages.
- Data folder (`data_dir` in `main.rs`): `~/Library/Application Support/Trix`, `%APPDATA%\Trix`; not Documents (macOS permission prompt, OneDrive sync). `TRIX_DATA_DIR`, then a `Trix-data` folder next to the app (portable), win. `move_old_lists` moves lists from next to the app (0.2 and earlier) once.
- Lookup matches the shown lists and Trix's own hotkey only. Combos compare by `comboId` (`ui/parse.js`).
- Window: borderless panel placed at the tray icon (`place`), hides on blur. Built in `build_panel`, not by config: links that would open in it go to the browser. macOS corners: public AppKit layer API (`round_corners`), not Tauri's private-API flag.
- Icons: Tabler, inline SVG, only where a word does not fit. App icon: `assets/icon.svg` → `npx tauri icon`.
- No network. UI strings Norwegian Bokmål, inline. No guidance text in the UI; format help lives in each file's top comment.
- No `PERSONVERN.md` until elzacka asks for it.
