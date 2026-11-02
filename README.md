# Trix Ultra

An app shell for quick reference on Windows and macOS:

- Four modules, each shown as a tab: shortcuts (`hurtigtaster`), lookup
  (`oppslag`), flip cards (`kort`), step-by-step guides (`steg`)
- Two window types: a panel at the menu bar or tray icon, or a normal window
- Appearance: colours for light and dark mode, fonts, icons, menu and every
  UI text, in one file or in «Tilpass»
- Your own content in plain Markdown files, one per tab, written by hand or
  imported from Word, RTF, Excel or CSV, also by dropping a file on a tab

No installer, no network.

## Use

Download, install, use and customize: [BRUKERVEILEDNING.md](BRUKERVEILEDNING.md)
(Norwegian). Formats: the top comment of [seed/Oppsett.md](seed/Oppsett.md)
and of each template in [seed/maler/](seed/maler/).

The option `system` reads, on macOS, System Settings → Keyboard Shortcuts and
App Shortcuts each time the app opens; on Windows [system/Windows.md](system/Windows.md).

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
   both platforms, and publishes release `v<version>` with an SBOM when
   CHANGELOG.md has a heading for it and CodeQL passed on the commit with no
   open high or critical alert. The download links in the user guide follow
   the latest release.

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
