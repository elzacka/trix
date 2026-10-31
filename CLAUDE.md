# Trix Ultra

Tauri 2 app (Windows, macOS), a configurable shell built on Trix (`~/dev/trix`): views, menu, colours, fonts, icons, window and texts from `Oppsett.md`, content from one Markdown file per view. An admin sets it up and publishes it to a team. Overview: `README.md`.

- Verify: `npm test`, then `npm run build:mac` (also runs `cargo test`) and open the app with `TRIX_ULTRA_DATA_DIR` set to a scratch folder. Windows: CI only (`build.yml`).
- Version: `src-tauri/Cargo.toml`; Tauri reads it.
- Frontend: plain ES modules in `ui/`, no bundler, no npm runtime dependencies. Parsers and setup (`parseSetup`, `TEXTS`) in `ui/parse.js`, pure, tested with `node --test`.
- One fact, one place, held by tests: `seed/Oppsett.md` equals `parseSetup('')` and lists every key in `TEXTS`; its colours, fonts and window match `ui/style.css` and `tauri.conf.json`.
- View types: `hurtigtaster`, `oppslag`, `kort`, `artikler`; template per type in `seed/maler/`, `{navn}` filled with the view's name. Generic type names; the user names the tabs.
- Files are the user's: written only when missing and on «Lagre»; `save` refuses when the file changed on disk since it was read. File and icon names from the setup: plain names in the data folder (`data_file` in `main.rs`, `listName`/`iconName` in `parse.js`).
- Setup icons: shown as image or CSS mask from a data URL, never as markup. Tray icon: PNG via `set_tray_icon`. The bundle icon is build time: `assets/icon.svg`.
- `Oppsett.md` is the source: the setup screen (`ui/setup.js`) parses it, previews each change in the app and writes it back with `formatSetup`, keeping the file's top comment. Admins can still edit the file by hand.
- Team copy: `publisert.json` in the data folder (`team.rs`) hides editing and setup. «Publiser» writes only into an empty or earlier-published folder. Settings are per device (`settings_dir`), never in the shared folder.
- Window type `panel` or `vindu` (`set_mode`): the last one is kept in settings so the app starts in it.
- Colours: setup sets `--<token>-light/-dark` on `:root` through CSSOM (CSP has no `'unsafe-inline'`); the rest derive with `color-mix`. Contrast under 4.5:1 is a warning, not a block.
- Window, data folder, system list, corners, links: as Trix's `CLAUDE.md`.
- No network. UI strings Norwegian Bokmål, defaults in `TEXTS`. No guidance text in the UI; format help lives in each file's top comment.
- No `PERSONVERN.md` until elzacka asks for it.
