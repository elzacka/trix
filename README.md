# Trix

An app shell for quick reference on Windows and macOS:

- Four modules, each shown as a tab: shortcuts (`hurtigtaster`), lookup
  (`oppslag`), flip cards (`kort`), step-by-step guides (`steg`)
- Two window types: a panel at the menu bar or tray icon, or a normal window
- Appearance: colours for light and dark mode, fonts, icons, menu and every
  UI text, in one file or in «Tilpass»
- Links between tabs, with a floating way back to the exact place
- Your own content in plain Markdown files, one per tab, written by hand or
  imported from Word, RTF, Excel or CSV, also by dropping a file on a tab

No network. Windows: a portable folder or the Microsoft Store.

## Use

Download and install: [INSTALLERING.md](INSTALLERING.md). Use and customize:
[BRUKERVEILEDNING.md](BRUKERVEILEDNING.md). Both in Norwegian. Formats: the top
comment of [seed/Oppsett.md](seed/Oppsett.md) and of each template in
[seed/maler/](seed/maler/).

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

The disk image window's arrow: [assets/dmg-background.svg](assets/dmg-background.svg),
positions as in `sign.sh`. `rsvg-convert` it to 600×400 and 1200×800 PNGs, then
`tiffutil -cathidpicheck <1x> <2x> -out assets/dmg-background.tiff`.

## Develop

1. Change, then `npm test` and `TRIX_DATA_DIR=/tmp/trix npm run dev`.
2. Bump `version` in [Cargo.toml](src-tauri/Cargo.toml), rename `Unreleased`
   in [CHANGELOG.md](CHANGELOG.md) to that version, commit.
3. Push to `main`. [build.yml](.github/workflows/build.yml) tests and builds
   both platforms, and publishes release `v<version>` with an SBOM when
   CHANGELOG.md has a heading for it and CodeQL passed on the commit with no
   open high or critical alert. The download links in INSTALLERING.md follow
   the latest release.

The release's macOS app is signed and notarized in CI from the secrets of the
environment `signing`, which only `main` can use (a ruleset blocks force pushes
to and deletion of `main`); without them the build is ad hoc and no release
goes out:

| Secret | Holds |
|---|---|
| `APPLE_CERTIFICATE` | The Developer ID Application certificate with its key, `.p12`, base64 |
| `APPLE_CERTIFICATE_PASSWORD` | The `.p12` password |
| `APPLE_API_KEY` | App Store Connect API key, `.p8`, base64 |
| `APPLE_API_KEY_ID`, `APPLE_API_ISSUER` | Its Key ID and Issuer ID |

`npm run build:mac` builds `dist/Trix-macOS.dmg` locally: signed with the
Developer ID in the keychain and notarized with the `notarytool` profile
`trix`, else ad hoc.

The Windows job also builds `Trix.msix` from
[store/AppxManifest.xml](store/AppxManifest.xml), starts it once on the runner
to check that the data folder stays `%APPDATA%\Trix` (`unvirtualizedResources`),
and keeps it with a screenshot as the artifact `store`. Upload it by hand in
Partner Center; the Store signs it. Privacy policy URL: `PERSONVERN.md` on
GitHub.

Credits: [TREDJEPART.md](TREDJEPART.md). Security: [SECURITY.md](SECURITY.md).
Privacy (nb): [PERSONVERN.md](PERSONVERN.md).
