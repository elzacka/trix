# Trix

Desktop app for Windows and macOS: own keyboard shortcuts and a cheat sheet,
read from two Markdown files you edit. No installer, no network.

| | |
|---|---|
| Files | `Hurtigtaster.md`, `Jukselapp.md`, `innstillinger.json` in `~/Library/Application Support/Trix` (macOS) or `%APPDATA%\Trix` (Windows), menu: «Åpne kildemappe»; created on first launch from [seed/](seed/). Lists next to the app (0.2 and earlier) move there on first launch |
| Portable | A folder `Trix-data` next to `Trix.exe` or `Trix.app` holds the files instead |
| Format | Comment at the top of each file |
| Edit | Pencil or Ctrl+E / ⌘E |
| Open | Tray or menu bar icon; Ctrl+Alt+T / ⌘⌥T (menu: «Endre hurtigåpner»; Backspace removes) |
| Lookup | Keyboard button, then the keys; or type them («cmd shift 4», «ctrl+c») |
| Menu: Visning | A–Å or file order; Hurtigtaster sorts groups and their lines. Hurtigtaster also: own list, the system's, or both (own first); the system's on macOS read from System Settings → Keyboard Shortcuts and App Shortcuts each time Trix opens, on Windows [system/Windows.md](system/Windows.md), Windows 11 and Norwegian Office |
| Menu: Kildedata | For the open tab: edit, export, import, open the folder. Import: replace or merge (lines or entries with a known name in the same group stay), result opens in the editor. Export: a copy in Downloads |
| Keys | Ctrl/⌘+1, 2 or Ctrl+Tab: tabs. Esc: close, clear, hide |
| Written elsewhere | WebView cache: `%LOCALAPPDATA%\no.tazk.trix` (Windows), `~/Library/WebKit/` and `~/Library/Caches/no.tazk.trix` (macOS) |

## Run

- macOS 15 or later: unzip, move `Trix.app` to Applications, open. The CI build
  is ad hoc signed: first launch needs System Settings → Privacy & Security →
  Open Anyway.
- Windows: `winget install elzacka.Trix`, then start with `trix` (Win+R). Or
  unzip and run `Trix\Trix.exe`: unsigned, so SmartScreen → More info → Run
  anyway. Needs WebView2, built into Windows 10 and 11.

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
