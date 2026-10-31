# Trix Ultra

Tray app for Windows and macOS, built from blocks you choose in one Markdown
file: views, menu, colours, fonts, icons, window size and every UI text. The
content is Markdown files you edit. No installer, no network.

| | |
|---|---|
| Files | `Oppsett.md`, one `.md` per view, `innstillinger.json` in `~/Library/Application Support/Trix Ultra` (macOS) or `%APPDATA%\Trix Ultra` (Windows). Created on first launch from [seed/](seed/) |
| Portable | A folder `Trix Ultra-data` next to the app holds the files instead |
| Setup | `Oppsett.md`, format in its top comment; menu «Endre oppsettet» or Ctrl+, / ⌘, |
| Content | Each view's file, format in its top comment; menu «Kildedata», or Ctrl+E / ⌘E |
| Open | Tray or menu bar icon; Ctrl+Alt+U / ⌘⌥U (menu: «Endre hurtigåpner») |
| Keys | Ctrl/⌘+1–9 or Ctrl+Tab: views. Esc: back, close, clear, hide |

## Setup blocks

| Section in `Oppsett.md` | Sets |
|---|---|
| `## Visninger` | Tabs in order: `Name \| type \| file \| options \| search placeholder`. A type can repeat with its own file |
| `## Meny` | Menu items in order: `visning`, `kildedata`, `oppsett`, `hurtigåpner`, `avslutt`, `versjon`, `---` |
| `## Farger` | `bakgrunn`, `flate`, `linje`, `tekst`, `dempet`, `aksent`, `på aksent`: light and dark. Contrast under 4.5:1 shows a warning |
| `## Skrift` | Text and key fonts (Syne, Inter or any installed font), size |
| `## Vindu` | Panel width and height |
| `## Ikoner` | SVG or PNG from the data folder: logo, menu bar/tray icon, the icons in the panel |
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

The icon in Finder, the Dock and Explorer is part of the build: replace
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
