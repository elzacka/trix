# Changelog

## Unreleased

- «Brukerveiledning» in the menu opens `BRUKERVEILEDNING.md` in the default text app. The file comes with the app, the dmg and the zip, and a new version replaces it. A setup that names the text or icon `til toppen` reads without a warning
- Links between tabs: `[tekst](Steg.md#tittel)` goes to a tab, or to an entry, a heading, a group or a shortcut in it; `#tittel` stays in the tab. An entry or a guide opens and a card turns on arrival
- «Tilbake til ‹sted›» floats at the foot of the window after a link, and Esc does the same: back to the same tab and scroll position, with its search, tags and open entry. × stays where you are (texts `tilbake til`, `bli her`)
- A warning names the file and line of a link to a tab or place that does not exist
- User guide: «Lenker» describes links to web pages and cross-links within and between modules, step by step
- Links have no underline: their own tone and weight, and a tint on hover (a card back turns its colours around). New colours `lenke` and `lenke på bakside`, at least 4.5:1 in both modes, hover included. A setup with its own colours gets these until it names them, and the contrast warning names any below 4.5:1
- A warning also names a link with only signs after `#`, and a link in a shortcut's name beside `*` or `` ` ``
- A–Å sorts a shortcut with a link to a web page by what shows
- With a single tab, focus goes to «Flere valg» where it would go to the hidden tab. A warning is read out by a screen reader once, not at each key press in the search, and a failure repeated is read out again. A successful export, view change or opening of «Tilpass» clears the last error
- Windows: a middle-click on a link to a tab stays in the app, and opens no browser (not tested on Windows)
- User guide: no section numbers. Download and install live in `INSTALLERING.md`, outside the app; «Bruk» names the quick-open keys
- User guide: says where the icon and the three-dot menu are and what the data folder is, and uses the labels in «Tilpass». «Ny versjon» on Windows replaces `Trix.exe`, so `Trix-data` stays; «Avinstaller» warns that deleting the folder `Trix` deletes a `Trix-data` inside it

## 2.1.0 - 2026-11-04

- «Tilpass»: drop-down lists as tall as the text fields and in the same font; checkboxes and radio buttons in the accent colour; menu and icon rows in one frame; «Vindustype» named beside its choices
- User guide: its sections listed after the introduction, and a «Til toppen» button once you scroll past them (icon and text `til toppen`)
- User guide: no introduction, shorter text without repeats, «Del med andre» as steps, quieter link lines, lines at most 44em wide
- A list item that goes on over indented lines shows as one item, as on GitHub
- The icons on «Tilbake», a tag's «Fjern» and a card's turn hint keep their shape after the app reads its files again
- «Tilbake» in the user guide and in Steg shows a visible hover
- Menu: «Endre innhold i ‹fane›» and «Åpne datamappen» are menu items of their own (`rediger`, `åpne mappe` under `## Meny`) above «Tilpass appen»; the submenu is «Importer/Eksporter»
- Menu: «Brukerveiledning» shows this user guide in the app (`brukerveiledning`)
- A setup from 2.0.0 gets the new menu: `rediger` and `åpne mappe` before `oppsett`, `brukerveiledning` before `avslutt`, where it has those, and the default texts «Importer/Eksporter», «Endre innhold i ‹fane›» and «Tilpass appen» in place of the older ones
- The Hurtigtaster template lists the Mac key symbols to copy: ⌘ ⌥ ⌃ ⇧ 🌐︎ ⇥ ↩ ⌫ ← → ↑ ↓
- fn shows as the globe 🌐︎ on a Mac, as in macOS menus; a pasted 🌐 reads as fn, and ← → ↑ ↓ as the arrow keys

## 2.0.0 - 2026-11-02

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
