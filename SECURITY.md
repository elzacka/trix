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
| IPC from the panel | Webview → Rust | File access beyond the data folder | Only the app's own commands; names checked as above; `open_url` http(s) only; remote pages get no IPC (Tauri, no `remote` capability) |
| Imported file | File → editor | Script; overwritten list | Same text-node rendering; written only on «Lagre», with the changed-on-disk check |
| Export | Rust → Downloads | Overwritten file | Never over an existing file |
| System list (macOS) | System prefs → Rust | Command injection | `/usr/bin/defaults`, `plutil`, `mdfind` by absolute path, arguments without a shell; bundle IDs limited to `[A-Za-z0-9.-]`; read only when a view shows it |
| `innstillinger.json`, `TRIX_ULTRA_DATA_DIR` | Disk, environment → Rust | Bad hotkey or folder | Parsed or rejected; same user's rights |
| Data folder | Other local accounts | Read the files | Per-user: `~/Library/Application Support/Trix Ultra` (`~/Library` is `700`), `%APPDATA%\Trix Ultra`; `Trix Ultra-data` next to the app only when the user makes it |
| App folder | User-writable folder | Planted DLL (Windows) | Keep the app in its own folder; unsigned |
| Single-instance socket in `/tmp` (macOS) | Other local accounts | Block start | Accepted: needs a hostile account on the same Mac |
| Downloaded build | Distribution | Tampered app | macOS: Developer ID, notarized ([build.sh](scripts/build.sh)), or ad hoc from CI; Windows: unsigned; CI builds both from `main` ([build.yml](.github/workflows/build.yml)) |

Reverse engineering, memory tampering and debuggers: the binary holds no secret and no licence check, so nothing to protect.
