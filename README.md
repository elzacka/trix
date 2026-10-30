# Trix

Portable desktop app for Windows and macOS: own keyboard shortcuts and a cheat
sheet, read from two Markdown files next to the app. No installer, no network.

| | |
|---|---|
| Files | `Hurtigtaster.md`, `Jukselapp.md`, `innstillinger.json` next to `Trix.exe` or `Trix.app`; created on first launch from [seed/](seed/) |
| Format | Comment at the top of each file |
| Edit | Pencil or Ctrl+E / ⌘E |
| Open | Tray or menu bar icon; Ctrl+Alt+T / ⌘⌥T (menu: change or remove) |
| Lookup | Keyboard button, then the keys; or type them («cmd shift 4», «ctrl+c») |
| Keys | Ctrl/⌘+1, 2 or Ctrl+Tab: tabs. Esc: close, clear, hide |
| Written elsewhere | WebView cache: `%LOCALAPPDATA%\no.tazk.trix` (Windows), `~/Library/WebKit/` and `~/Library/Caches/no.tazk.trix` (macOS) |

## Run

- macOS: unzip, move `Trix.app` to any folder in Finder, open. The CI build is
  ad hoc signed: first launch needs System Settings → Privacy & Security → Open
  Anyway.
- Windows: `winget install elzacka.Trix`, then start with `trix` (Win+R). The
  lists sit in winget's package folder (menu: show source folder); `winget
  uninstall --purge` deletes them. Or unzip and run `Trix\Trix.exe`: unsigned,
  so SmartScreen → More info → Run anyway. Needs WebView2, built into Windows
  10 and 11.

## Build

```sh
npm ci
npm test            # parsers
npm run dev         # files land in src-tauri/target/debug/
npm run build:mac   # dist/Trix-macOS.zip, universal
```

`build:mac` signs with the Developer ID in the keychain and notarizes with the
`notarytool` profile `trix`; without a Developer ID it signs ad hoc.

CI: [build.yml](.github/workflows/build.yml) on each push to `main`, artifacts
`Trix-Windows.zip` and `Trix-macOS.zip`. winget manifests for a release:
`scripts/winget.sh <version>`.

## Code signing

- macOS: Apple Developer ID, notarized.
- Windows: `Trix.exe` unsigned. winget checks the zip's SHA-256; each release
  lists its checksums.

Credits: [TREDJEPART.md](TREDJEPART.md). Security: [SECURITY.md](SECURITY.md).
