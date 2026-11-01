# Trix

Portable tray app for Windows and macOS: Your own keyboard shortcuts and a
cheat sheet from Markdown files you edit. No installer, no network.

| | |
|---|---|
| Files | `Hurtigtaster.md`, `Jukselapp.md`, `innstillinger.json` in `~/Library/Application Support/Trix` (macOS) or `%APPDATA%\Trix` (Windows), menu: «Åpne kildemappe»; created on first launch from [seed/](seed/). Lists found next to the app move there while the folder is empty |
| Portable | A folder `Trix-data` next to `Trix.exe` or `Trix.app` holds the files instead |
| Format | Comment at the top of each file |
| Edit | Menu: «Se og endre i fila», or Ctrl+E / ⌘E |
| Open | Tray or menu bar icon; Ctrl+Alt+T / ⌘⌥T (menu: «Endre hurtigåpner»; Backspace removes) |
| Lookup | Keyboard button, then the keys; or type them («cmd shift 4», «ctrl+c») |
| Menu: Visning | A–Å or file order; Hurtigtaster sorts groups and their lines. Hurtigtaster also: own list, the system's, or both (own first); the system's on macOS read from System Settings → Keyboard Shortcuts and App Shortcuts each time Trix opens, on Windows [system/Windows.md](system/Windows.md), Windows 11 and Norwegian Office |
| Menu: Kildedata | For the open tab: edit, export, import, open the folder. Import: replace or merge (lines or entries with a known name in the same group stay), result opens in the editor. Export: a copy in Downloads |
| Keys | Ctrl/⌘+1, 2 or Ctrl+Tab: tabs. Esc: close, clear, hide |
| Written elsewhere | WebView cache: `%LOCALAPPDATA%\no.tazk.trix` (Windows), `~/Library/WebKit/` and `~/Library/Caches/no.tazk.trix` (macOS) |

## Run

Download [Trix-macOS.zip](https://github.com/elzacka/trix/releases/latest/download/Trix-macOS.zip)
or [Trix-Windows.zip](https://github.com/elzacka/trix/releases/latest/download/Trix-Windows.zip);
each release lists their SHA-256.

- macOS 15 or later: unzip, move `Trix.app` to Applications, open. Signed with
  Apple Developer ID and notarized.
- Windows: unzip and run `Trix\Trix.exe`: unsigned, so SmartScreen → More info
  → Run anyway. winget: `winget install elzacka.Trix`, then `trix` (Win+R),
  once the package passes winget's review; winget checks the zip's SHA-256.
  Needs WebView2, built into Windows 10 and 11.

## Build

```sh
npm ci
npm test            # parsers
TRIX_DATA_DIR=/tmp/trix npm run dev   # without it: your own lists
npm run build:mac   # dist/Trix-macOS.zip, universal
```

`build:mac` signs with the Developer ID in the keychain and notarizes with the
`notarytool` profile `trix`; without a Developer ID it signs ad hoc.

CI: [build.yml](.github/workflows/build.yml) on each push to `main`, artifacts
`Trix-Windows.zip` and `Trix-macOS.zip` (ad hoc signed). A release holds
`Trix-macOS.zip` from `build:mac` and `Trix-Windows.zip` from CI. winget
manifests for a release: `scripts/winget.sh <version>`.

Credits: [TREDJEPART.md](TREDJEPART.md). Security: [SECURITY.md](SECURITY.md).
