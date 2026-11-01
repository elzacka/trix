# Trix Ultra

Build your own quick-reference app for Windows and macOS: Keyboard shortcuts,
glossary, flip cards and step-by-step guides as tabs, from Markdown files.
Choose the views, menu, colours, fonts, icons, window and every UI text in one
file or in «Tilpass». No installer, no network.

## Get started

1. Download [Trix-Ultra-macOS.dmg](https://github.com/elzacka/trix-ultra/releases/latest/download/Trix-Ultra-macOS.dmg)
   or [Trix-Ultra-Windows.zip](https://github.com/elzacka/trix-ultra/releases/latest/download/Trix-Ultra-Windows.zip).
2. Open it.
   - macOS 15 or later: double-click the dmg, drag `Trix Ultra` to
     Applications, open it from there.
   - Windows: Extract all, then `Trix Ultra\Trix Ultra.exe`. First time:
     SmartScreen → More info → Run anyway (unsigned). Needs WebView2, built
     into Windows 10 and 11.
3. The icon sits in the menu bar or the taskbar. Menu «Tilpass» customizes;
   «Åpne Oppsett.md» there opens the file instead.

A new version: download again and replace the app. The files stay.

| | |
|---|---|
| Files | `Oppsett.md`, one `.md` per view, icons, in `~/Library/Application Support/Trix Ultra` (macOS) or `%APPDATA%\Trix Ultra` (Windows). Created on first launch from [seed/](seed/) |
| Portable | A folder `Trix Ultra-data` next to the app holds the files instead; in a shared folder, everyone sees the same content. Give others write access to `Trix Ultra-data` only, never to the app beside it |
| Per device | `innstillinger.json` in the folder above, never in the shared one: hotkey, system list, window type |
| Setup | Menu «Tilpass» or Ctrl+, / ⌘,: a window beside the panel, each change shows at once, «Lagre» writes `Oppsett.md`. Or the file in any editor («Åpne Oppsett.md» in «Tilpass»): shows when saved, format in its top comment |
| Content | Each view's file, format in its top comment; menu «Kildedata», or Ctrl+E / ⌘E |
| Open | Panel: tray or menu bar icon. Window: like other apps, from the folder, Dock or taskbar. Both: Ctrl+Alt+U / ⌘⌥U (menu: «Endre hurtigåpner») |
| Keys | Ctrl/⌘+1–9 or Ctrl+Tab: views. Esc: back, close, clear, hide |

## Setup blocks

| Section in `Oppsett.md` | Sets |
|---|---|
| `## Visninger` | Tabs in order: `Name \| type \| file \| options \| search placeholder`. A type can repeat with its own file |
| `## Meny` | Menu items in order: `visning`, `kildedata`, `oppsett`, `hurtigåpner`, `avslutt`, `versjon`, `---` |
| `## Farger` | `bakgrunn`, `flate`, `linje`, `tekst`, `dempet`, `aksent`, `på aksent`, and the cards' `forside`, `på forside`, `bakside`, `på bakside`: light and dark. Contrast under 4.5:1 shows a warning |
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
| `kort` | Cards: front (name, first paragraph), back (the rest); flip on click, flip icon on both faces | Tool overview, flashcards | as `oppslag` |
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

## Develop

1. Change, then `npm test` and `TRIX_ULTRA_DATA_DIR=/tmp/tu npm run dev`.
2. Bump `version` in [Cargo.toml](src-tauri/Cargo.toml), rename `Unreleased`
   in [CHANGELOG.md](CHANGELOG.md) to that version, commit.
3. Push to `main`. [build.yml](.github/workflows/build.yml) tests and builds
   both platforms, and publishes release `v<version>` when CHANGELOG.md has a
   heading for it. The links in *Get started* follow the latest release.

The release's macOS app is signed and notarized in CI from repository secrets;
without them the build is ad hoc and no release goes out:

| Secret | Holds |
|---|---|
| `APPLE_CERTIFICATE` | The Developer ID Application certificate with its key, `.p12`, base64 |
| `APPLE_CERTIFICATE_PASSWORD` | The `.p12` password |
| `APPLE_API_KEY` | App Store Connect API key, `.p8`, base64 |
| `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | Its Key ID and Issuer ID |

`npm run build:mac` builds `dist/Trix-Ultra-macOS.dmg` locally: signed with the
Developer ID in the keychain and notarized with the `notarytool` profile
`trix`, else ad hoc.

Credits: [TREDJEPART.md](TREDJEPART.md). Security: [SECURITY.md](SECURITY.md).
