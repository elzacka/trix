# Security

Report a vulnerability: hei@tazk.no.

## Threat model

One process with the user's rights, no elevated parts, no network, no listening port.

| Entry point | Trust boundary | Threat | Mitigation |
|---|---|---|---|
| View files (may come from someone else) | File → webview | Script in the content | Text nodes only, CSP `'self'`; links `https?://` only |
| `Oppsett.md` | File → webview, Rust | Path out of the data folder; CSS or script injection | File and icon names: plain names with `.md`, `.svg` or `.png`, checked in `parse.js` and again in `data_file`; colours through CSSOM, only values `CSS.supports` accepts as a colour; font names letters, digits, space, `-`, `_` |
| Icons from the setup | File → webview, tray | Script in an SVG; large file | Shown as `<img>` or CSS mask from a data URL, never inserted as markup; 1 MB limit; tray: PNG decoded by Tauri |
| Links in the content | Webview → browser | Web page in the panel | `on_navigation`: own origin only; `on_new_window`: deny; http(s) goes to the browser |
| IPC from the panel | Webview → Rust | File access beyond the data folder | Only the panel's commands (`capabilities/default.json`) and Tauri's events; names checked as above; `save` refuses `Oppsett.md`, also through a link or short name; `open_url` http(s) only; remote pages get no IPC (Tauri, no `remote` capability) |
| IPC from «Tilpass» | Webview → Rust | Access to the lists or links | Only its commands (`capabilities/tilpass.json`): read and write `Oppsett.md`, add an icon, read a dropped file, open `Oppsett.md`; `build.rs` makes every other app command a deny; of Tauri's own, events and closing its window only |
| «Tilpass»: icon chosen or dropped | Any file → data folder | Overwritten file; large file | `add_icon`: `.svg`/`.png` by name, 1 MB, a free name beside an existing file; `read_dropped` reads only a path from the last drop on «Tilpass» (`DragDrop` in Rust), 1 MB |
| Shared data folder (`Trix Ultra-data`, `TRIX_ULTRA_DATA_DIR`) | Others with write access → files | Changed content or setup | The folder's own access rights decide who can write; per-device settings stay outside it |
| Imported file | File → editor | Script; overwritten list | Same text-node rendering; written only on «Lagre», with the changed-on-disk check |
| Export | Rust → Downloads | Overwritten file | Never over an existing file |
| System list (macOS) | System prefs → Rust | Command injection | `/usr/bin/defaults`, `plutil`, `mdfind` by absolute path, arguments without a shell; bundle IDs limited to `[A-Za-z0-9.-]`; read only when a view shows it |
| `innstillinger.json`, `TRIX_ULTRA_DATA_DIR` | Disk, environment → Rust | Bad hotkey or folder | Parsed or rejected; same user's rights |
| Data folder | Other local accounts | Read the files | Per-user: `~/Library/Application Support/Trix Ultra` (`~/Library` is `700`), `%APPDATA%\Trix Ultra`; `Trix Ultra-data` next to the app only when the user makes it |
| App folder | User-writable folder | Planted DLL (Windows) | Keep the app in its own folder; unsigned |
| Single-instance socket in `/tmp` (macOS) | Other local accounts | Block start | Accepted: needs a hostile account on the same Mac |
| Downloaded build | Distribution | Tampered app | Release assets only from CI on `main` ([build.yml](.github/workflows/build.yml)); macOS: Developer ID and notarized ([build.sh](scripts/build.sh)), no release without it; Windows unsigned. Release job: no npm, write token only there |
| Signing secrets in CI | Workflow → certificate, API key | Leaked certificate | Repository secrets, read only on `main` in the macOS job; temporary keychain made after `npm ci`; files deleted after import; the API key is a revocable team key, not the Apple ID password |

Reverse engineering, memory tampering and debuggers: the binary holds no secret and no licence check, so nothing to protect.
