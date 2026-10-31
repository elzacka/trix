# Trix Ultra

App for Windows and macOS, built from blocks an admin chooses for a team:
views, menu, colours, fonts, icons, window and every UI text, all in one
Markdown file. The content is Markdown files. No installer, no network.

| | |
|---|---|
| Files | `Oppsett.md`, one `.md` per view, icons, in `~/Library/Application Support/Trix Ultra` (macOS) or `%APPDATA%\Trix Ultra` (Windows). Created on first launch from [seed/](seed/) |
| Portable | A folder `Trix Ultra-data` next to the app holds the files instead |
| Per device | `innstillinger.json` in the folder above, never in the shared one: hotkey, system list, window type, last team folder |
| Setup | Menu «Endre oppsettet» or Ctrl+, / ⌘,: a screen that writes `Oppsett.md`; or the file itself, format in its top comment |
| Content | Each view's file, format in its top comment; menu «Kildedata», or Ctrl+E / ⌘E |
| Open | Panel: tray or menu bar icon. Window: like other apps, from the folder, Dock or taskbar. Both: Ctrl+Alt+U / ⌘⌥U (menu: «Endre hurtigåpner») |
| Keys | Ctrl/⌘+1–9 or Ctrl+Tab: views. Esc: back, close, clear, hide |

## Admin and team

| | Admin | Team |
|---|---|---|
| Copy | Own data folder; setup screen and editing | `Trix Ultra-data` with `publisert.json` beside the app: content only, no editing or setup |
| Share | Setup screen → «Del med teamet»: «Publiser» copies the app and the data to a folder (drag it in), such as a Teams or SharePoint folder synced with OneDrive; «Lag zip» puts the same in Downloads | Opens the app in that folder; a synced folder brings each new publish |
| By hand | Copy the app and the data folder yourself, with `publisert.json` in it (`{}` is enough) | Same |

«Publiser» writes only to an empty folder or one published to before. The app
copied is the admin's platform: a mixed team gets the other build beside it
(`Trix Ultra.app` and `Trix Ultra.exe` share `Trix Ultra-data`).

## Setup blocks

| Section in `Oppsett.md` | Sets |
|---|---|
| `## Visninger` | Tabs in order: `Name \| type \| file \| options \| search placeholder`. A type can repeat with its own file |
| `## Meny` | Menu items in order: `visning`, `kildedata`, `oppsett`, `hurtigåpner`, `avslutt`, `versjon`, `---` |
| `## Farger` | `bakgrunn`, `flate`, `linje`, `tekst`, `dempet`, `aksent`, `på aksent`: light and dark. Contrast under 4.5:1 shows a warning |
| `## Skrift` | Text and key fonts (Syne, Inter or any installed font), size |
| `## Vindu` | `type`: panel at the tray icon, or a normal window in the Dock or taskbar; width, height |
| `## Ikoner` | SVG or PNG from the data folder: logo, menu bar/tray icon, window icon (Windows), the icons in the app |
| `## Tekster` | Every UI string, with `{placeholders}` |

A missing section keeps the defaults; a bad line shows as a warning with its
line number and is left out.

| Type | Holds | Fits | Options (default \*) |
|---|---|---|---|
| `hurtigtaster` | Actions and keys per OS; lookup by pressing or typing a combination; the system's own shortcuts | Shortcuts for any program | `søk`\*, `tasteoppslag`\*, `system`, `a–å` |
| `oppslag` | Entries: name, explanation, other names, tags | Glossary, cheat sheet, FAQ, phone list | `søk`\*, `emneknagger`\*, `a–å` |
| `kort` | Cards: front (name, first paragraph), back (the rest); flip on click | Tool overview, flashcards | as `oppslag` |
| `artikler` | Title, lead, sections; opens to read in the panel | How-tos, guides | as `oppslag` |

`system` reads, on macOS, System Settings → Keyboard Shortcuts and App
Shortcuts each time the app opens; on Windows [system/Windows.md](system/Windows.md).

## App icon

The icon in Finder, the Dock and Explorer is part of the build (the setup's
`app` icon is the window and taskbar icon on Windows while it runs): replace
[assets/icon.svg](assets/icon.svg) (and [assets/tray.svg](assets/tray.svg) for
the default menu bar icon), then `npx tauri icon assets/icon.svg -o
src-tauri/icons`, `rsvg-convert -w 44 -h 44 assets/tray.svg -o
src-tauri/icons/tray.png`, keep the files `tauri.conf.json` lists, and build.
Name and identifier: `productName`, `identifier` in
[tauri.conf.json](src-tauri/tauri.conf.json).

## Run

- macOS 15 or later: unzip, move `Trix Ultra.app` to Applications, open. The
  CI build is ad hoc signed: first launch needs System Settings → Privacy &
  Security → Open Anyway.
- Windows: unzip and run `Trix Ultra\Trix Ultra.exe`: unsigned, so SmartScreen
  → More info → Run anyway. Needs WebView2, built into Windows 10 and 11.

## Build

```sh
npm ci
npm test                                  # parsers and setup
TRIX_ULTRA_DATA_DIR=/tmp/tu npm run dev   # without it: your own files
npm run build:mac                         # dist/Trix-Ultra-macOS.zip, universal
```

`build:mac` signs with the Developer ID in the keychain and notarizes with the
`notarytool` profile `trix`; without a Developer ID it signs ad hoc. CI:
[build.yml](.github/workflows/build.yml) on each push to `main`, artifacts
`Trix-Ultra-Windows.zip` and `Trix-Ultra-macOS.zip`.

Credits: [TREDJEPART.md](TREDJEPART.md). Security: [SECURITY.md](SECURITY.md).
