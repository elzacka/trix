# Trix

Tauri 2 app (Windows, macOS), an app shell built on Trix Mini (`~/dev/trix_mini`): modules, menu, colours, fonts, icons, window and texts from `Oppsett.md`, content from one Markdown file per tab. Anyone customizes it, in «Tilpass» or in `Oppsett.md`. Overview: `README.md`; install (nb): `INSTALLERING.md`, outside the app; user guide (nb): `BRUKERVEILEDNING.md`.

- Verify: `npm test`, then `npm run build:mac` (also runs `cargo test`) and open the app with `TRIX_DATA_DIR` set to a scratch folder. Windows: CI only (`build.yml`).
- Shows only after a new build, also for a text change: `ui/`, `BRUKERVEILEDNING.md`, `seed/` (reaches only a data folder that lacks the file, so check it with an empty one), `system/Windows.md`, `src-tauri/icons/`, `store/`. Files in the data folder show without a build. A build leaves `/Applications` as it is: open `src-tauri/target/universal-apple-darwin/release/bundle/macos/Trix.app`, with any running Trix quit first.
- Version: `src-tauri/Cargo.toml`; Tauri reads it. A new version with its CHANGELOG heading on `main`: `build.yml` publishes release `v<version>` with the Windows zip, the macOS `.dmg` and an SPDX SBOM once CodeQL (default setup, a repo setting) passed on the commit, app and dmg signed and notarized from the `APPLE_*` secrets (README, Develop); `INSTALLERING.md` links to `releases/latest/download/`.
- Frontend: plain ES modules in `ui/`, no bundler, no npm runtime dependencies. Parsers and setup (`parseSetup`, `TEXTS`) in `ui/parse.js`; import converters in `ui/import.js` (one per format: `docx.js`, `rtf.js`, `xlsx.js`, `csv.js`); all pure, tested with `node --test`. The main window has Tauri's drop handler off: a dropped file reaches the webview as a `File`, never as a path in Rust.
- One fact, one place, held by tests: `seed/Oppsett.md` equals `parseSetup('')` and lists every key in `TEXTS`; its colours, fonts and window match `ui/style.css` and `tauri.conf.json`.
- One term per concept in code, UI and docs:

  | nb (UI, user docs) | en (code, developer docs) |
  |---|---|
  | modul: `hurtigtaster`, `oppslag`, `kort`, `steg` (`MODULES`), under `## Moduler` | module |
  | fane: where a module shows | tab |
  | innhold: one Markdown file per tab | content |
  | utseende | appearance |
  | vindustype: `panel`, `vindu` | window type |
  | datamappen | data folder |

  Main window (`main`) whatever its window type; «panel» only for the window type. «Tilpass» is a window, never a module. Older names still read (`RENAMED`): `## Visninger`, `kildedata`, `{visning}`. Every setup file names every text, so a changed default in `TEXTS` needs its old value in `OLDER_TEXTS`. Template per module in `seed/maler/`, `{navn}` filled with the tab's name.
- Files are the user's: written only when missing and on «Lagre»; `save` refuses when the file changed on disk since it was read. File and icon names from the setup: plain names in the data folder (`data_file` in `main.rs`, `contentName`/`iconName` in `parse.js`).
- Setup icons: shown as image or CSS mask from a data URL, never as markup. Tray icon: PNG via `set_tray_icon`. The bundle icon is build time: `assets/icon.svg`.
- `Oppsett.md` is the source. «Tilpass» (`ui/setup.html`, `setup.js`) is a window of its own: it parses the file, sends each change to the main window as event `preview`, and «Lagre» writes it back with `formatSetup` (`save_setup`), keeping the file's top comment. The panel's `save` refuses `Oppsett.md`.
- Commands per window: `build.rs` lists them, `capabilities/` grants each window its own. A change in the data folder (`watch`, polled each second) reloads both windows. Settings are per device (`settings_dir`), never in a shared data folder.
- Links between tabs: `[tekst](Fil.md#sted)` or `#sted`, `sted` a heading slug (`findAnchor`), broken ones warned on load (`linkProblems`). `state.trail` holds what each followed link left; `#return` restores it. Internal links never reach Rust.
- Window type `panel` or `vindu` (`set_mode`): the last one is kept in settings so the app starts in it.
- Colours: setup sets `--<token>-light/-dark` on `:root` through CSSOM (CSP has no `'unsafe-inline'`); the rest derive with `color-mix`. Contrast under 4.5:1 is a warning, not a block.
- Window, data folder, system list, corners, links: as Trix Mini's `CLAUDE.md`.
- «Brukerveiledning»: `open_guide` opens `BRUKERVEILEDNING.md`, a bundle resource (macOS: read-only, `sign.sh`), in the default app; also in the Windows zip, so a new version replaces it; the dmg holds only the app. Links to other files are web addresses; `#anchors` are GitHub's heading slugs, both held by tests.
- No network. UI strings Norwegian Bokmål, defaults in `TEXTS`. No guidance text in the UI; format help lives in each file's top comment.
- Microsoft Store: `store/AppxManifest.xml`, Identity from Partner Center. `build.yml` builds `Trix.msix` (artifact `store`) and starts it on the runner; uploaded by hand, Microsoft signs it. `unvirtualizedResources` keeps the data folder at `%APPDATA%\Trix`.
- `PERSONVERN.md`: its GitHub address is the Store's privacy policy URL.
