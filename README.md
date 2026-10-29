# Trix (universal)

Portable desktop app for Windows and macOS: own keyboard shortcuts and a cheat
sheet, read from two Markdown files next to the app. No installer, no network.

| | |
|---|---|
| Files | `Hurtigtaster.md`, `Jukselapp.md`, `innstillinger.json` next to `Trix.exe` or `Trix Universal.app`; created on first launch from [seed/](seed/) |
| Format | Comment at the top of each file |
| Edit | Pencil or Ctrl+E / ⌘E |
| Open | Tray or menu bar icon; Ctrl+Alt+T / ⌘⌥T (menu: change or remove) |
| Lookup | Keyboard button, then the keys; or type them («cmd shift 4», «ctrl+c») |
| Keys | Ctrl/⌘+1, 2 or Ctrl+Tab: tabs. Esc: close, clear, hide |
| Written elsewhere | WebView cache: `%LOCALAPPDATA%\no.tazk.trix-universal` (Windows), `~/Library/WebKit/` and `~/Library/Caches/no.tazk.trix-universal` (macOS) |

## Run

- macOS: unzip, move `Trix Universal.app` to any folder in Finder, open. Unsigned: first
  launch needs System Settings → Privacy & Security → Open Anyway.
- Windows: unzip, run `Trix\Trix.exe`. Unsigned: SmartScreen → More info → Run
  anyway. Needs WebView2, built into Windows 10 and 11.

## Build

```sh
npm ci
npm test            # parsers
npm run dev         # files land in src-tauri/target/debug/
npm run build:mac   # dist/Trix-macOS.zip, universal
```

Windows: [build.yml](.github/workflows/build.yml) on `windows-latest`,
artifact `Trix-Windows`.

Credits: [TREDJEPART.md](TREDJEPART.md).
