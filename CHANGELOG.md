# Changelog

## Unreleased

- Hurtigtaster: text in quotes in the keys field shows as text, like «eller» ("hold inne" ⌘W); lookup finds the keys
- Lists and settings in `~/Library/Application Support/Trix` (macOS) or `%APPDATA%\Trix` (Windows); lists next to the app move there on first launch. Portable: a `Trix-data` folder next to the app
- Menu «Visning»: A–Å or file order on both tabs; on Hurtigtaster also own shortcuts, the system's, or both. macOS: System Settings' shortcuts as set on this Mac, App Shortcuts included. Windows: Windows 11, Norwegian Office and browsers
- Menu «Kildedata» for both lists, in place of the pencil: edit the file, export to Downloads, import (replace or merge), open the folder
- Menu «Endre hurtigåpner» shows the current hotkey
- Hurtigtaster for new users: four examples and Trix's own keys
- Focused buttons: one ring
- macOS 15 or later, the versions Apple still patches

## 0.2.0 - 2026-10-30

- Hurtigtaster for new users lists Trix's own keys
- Windows: `winget install elzacka.Trix`; started through winget's `trix` link, Trix keeps the lists next to the real `Trix.exe`
- Windows zip holds only `Trix\Trix.exe`

## 0.1.0 - 2026-10-30

- Hurtigtaster: groups, Windows and Mac keys per line, search, lookup by key press or typed combination; `\|` for a | in a name
- Jukselapp: groups or A–Å, search, tags, aliases, links that open in the browser
- Ctrl+Tab switches tabs
- Built-in editor; menu: show source folder, hotkey, quit. A list that is a symbolic link stays one when saved
- macOS: signed with Developer ID and notarized; opens without "Open Anyway"
- Right-click in the panel shows no browser menu (Reload); text fields keep copy and paste
- Menu shows the version and the maker
- Opens as a panel under the menu bar icon (above the tray icon on Windows) or with a global hotkey; closes on click elsewhere
