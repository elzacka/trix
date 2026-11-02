# Changelog

## Unreleased

- The app is called Trix: app ID `no.tazk.trix`, data folder `Trix`, shared folder `Trix-data`, release files `Trix-macOS.dmg` and `Trix-Windows.zip`, repo `elzacka/trix`. A data folder named `Trix Ultra` is not read

## 1.4.0 - 2026-11-02

- Tables in Markdown (`| a | b |`, `| --- | --- |`) on a card back, in a guide in Steg and in an Oppslag entry; text in tables is searchable; the Kort and Steg templates show one each
- One term per concept in the app, «Tilpass», `Oppsett.md` and the docs: modules (shown as tabs) under «Moduler» with the column `modul`; «Innhold ‹fane›» in the menu, key `innhold` and placeholder `{fane}`; «Åpne datamappen»; «Rekkefølgen i fila». Older setups with `## Visninger`, `kildedata` and `{visning}` still read
- The user guide and README open with what the app is: modules, window types, appearance, your own content
- Import Word (`.docx`) and RTF (`.rtf`) files: headings become groups and entries; lists, tables, bold, italic and links carry over
- Import Excel (`.xlsx`) and CSV (`.csv`) files as tables: each sheet becomes an entry holding its table, with bold, italic, links and dates
- Drag a file onto a tab to import it into that tab (window type «Vanlig vindu»)
- Tables show faint lines between rows and columns, in light and dark mode and on a card back
- Table text, column names included, is a little smaller than body text; column names are bold, below the headings above them
- A file that would unpack too much, hold too many table cells or nest too deep is refused, and a long line with unclosed `*`, `` ` `` or `[` renders without delay
- A content file shows at most 100 000 table cells, so a table with a very wide header cannot freeze the window

## 1.3.1 - 2026-11-01

- Saving a file, and creating a missing one, never writes through a symbolic link someone else placed in a shared data folder
- Each release carries an SBOM, `Trix-Ultra-SBOM.spdx.json`, and goes out only after CodeQL finds no open high or critical alert

## 1.3.0 - 2026-11-01

- «Tilpass», Farger: the colours grouped by where they show (Generelt, Knapper og lenker, Kort) under plain names; the contrast warning uses the same names
- Kort, light mode: the front is dark blue (#1e293b) with white text by default

## 1.2.2 - 2026-11-01

- Kort: the turn icon sits in the same place on the front and the back, at the foot of the card
- Demo content: Tiltakskort for power loss with light, heat and fire safety

## 1.2.1 - 2026-11-01

- Kort: every card in a row is as tall as the tallest card in it
- Demo content: clearer explanations in Oppslag, shorter titles in Hurtigtaster and Steg

## 1.2.0 - 2026-11-01

- Kort: options «N i bredden» and «N i høyden» (1–6) and the same choices in «Tilpass»; cards share the width and fill the height, and follow the window size
- View type `steg`, default tab «Steg»: guides in steps
- Demo content on emergency preparedness (Beredskap): groups and entries in A–Å order, Tiltakskort in scenario order
- Kort: the card name on the back stands out from its headings; each card is as tall as its own content; the turn icon sits under the last line on both sides; the front shows bold, italic and code; screen readers read the front's text; long words wrap
- Contrast: default «dempet» (light) and «aksent», «bakside» (dark) pass AA on every shade the app mixes; the warning checks those shades and aksent on bakgrunn
- Tags on a card back show hover and selection; focus rings stay visible on the back and on filled buttons; search and setup fields have borders at 3:1; tabs react to hover; an open Oppslag entry has even spacing

## 1.1.0 - 2026-11-01

- User guide in Norwegian, `BRUKERVEILEDNING.md`: download to uninstall, both ways to customize, where the files are
- macOS: download as a disk image (`.dmg`); drag the app to Applications
- «Tilpass»: a new tab's file never takes the name `Oppsett.md`

## 1.0.0 - 2026-11-01

- Each version as a GitHub Release with the macOS and Windows app; download links at the top of the README
- Setup in `Oppsett.md`: views in any order and number, menu items, colours for light and dark mode, fonts, window size, icons and every UI text; warnings name the line, and contrast under 4.5:1
- View types: `hurtigtaster` (from Trix), `oppslag` (Trix's Jukselapp, with headings and lists), `kort` (flip cards with their own front and back colours and a flip icon), `artikler` (read in the panel); a template per type
- Per view: search, search placeholder, key lookup, the system's shortcuts, tags, A–Å
- Own icons: SVG or PNG for the logo, the menu bar or tray icon, the window icon (Windows) and the icons in the app
- «Tilpass» (Ctrl+, / ⌘,), a window beside the panel: drag or move tabs and menu items, tick options, pick colours (picker or hex code) and fonts, choose or drop icons, edit texts; each change shows in the panel at once and «Lagre» writes `Oppsett.md`
- Every user customizes: «Tilpass» or `Oppsett.md` in any editor; a saved change in the data folder shows within a second
- Window type: panel at the tray icon, or a normal window in the Dock or taskbar
- Settings per device, outside a shared folder
