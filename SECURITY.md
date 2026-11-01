# Security

Report a vulnerability: hei@tazk.no.

| Scope | Standard |
|---|---|
| App | [OWASP ASVS](https://github.com/OWASP/ASVS) 5.0.0 Level 1 (no personal data); [Tauri 2 security model](https://v2.tauri.app/security/) |
| Desktop checklist | [OWASP TCASVS](https://github.com/OWASP/TCASVS) 5.0.2 Level 1 |
| Tests | [OWASP WSTG](https://owasp.org/www-project-web-security-testing-guide/) 4.2 |
| Build and release | [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) |

Last review: 2026-11-01, version 1.3.0 and its fixes. The mitigations below are its result.

## Threat model

One process with the user's rights, no elevated parts, no network, no listening port.

| Entry point | Trust boundary | Threat | Mitigation |
|---|---|---|---|
| Content files (may come from someone else) | File → webview | Script in the content | Text nodes only, CSP `'self'`; links `https?://` only |
| `Oppsett.md` | File → webview, Rust | Path out of the data folder; CSS or script injection | File and icon names: plain names with `.md`, `.svg` or `.png`, checked in `parse.js` and again in `data_file`; colours through CSSOM, only values `CSS.supports` accepts as a colour; font names letters, digits, space, `-`, `_` |
| Icons from the setup | File → webview, tray | Script in an SVG; large file | Shown as `<img>` or CSS mask from a data URL, never inserted as markup; 1 MB limit; tray: PNG decoded by Tauri |
| Links in the content | Webview → browser | Web page in the main window | `on_navigation`: own origin only; `on_new_window`: deny; http(s) goes to the browser |
| IPC from the main window | Webview → Rust | File access beyond the data folder | Only the main window's commands (`capabilities/default.json`) and Tauri's events; names checked as above; `save` refuses `Oppsett.md`, also through a link or short name; `open_url` http(s) only; remote pages get no IPC (Tauri, no `remote` capability) |
| IPC from «Tilpass» | Webview → Rust | Access to the content files or links | Only its commands (`capabilities/tilpass.json`): read and write `Oppsett.md`, add an icon, read a dropped file, open `Oppsett.md`; `build.rs` makes every other app command a deny; of Tauri's own, events and closing, destroying and titling app windows |
| «Tilpass»: icon chosen or dropped | Any file → data folder | Overwritten file; large file | `add_icon`: `.svg`/`.png` by name, 1 MB, a free name beside an existing file; `read_dropped` reads only a path from the last drop on «Tilpass» (`DragDrop` in Rust), 1 MB |
| Shared data folder (`Trix Ultra-data`) | Others with write access → files, app | Changed content or setup; replaced app (Windows: unsigned) | The folder's own access rights decide who can write; per-device settings stay outside it; a new file and the temp file on save are never written through a link placed there (`write_new`), a view file that is itself a link saves to the file it points to; [BRUKERVEILEDNING.md](BRUKERVEILEDNING.md): others get write access to `Trix Ultra-data` only, never to the app beside it |
| Imported file (`.md`, `.txt`, `.rtf`, `.docx`), picked or dropped on the main window | File → webview → editor | Script; zip bomb; entity expansion; hang on a crafted file; overwritten content | Converted in the webview to Markdown (`ui/import.js`, `docx.js`, `rtf.js`), no IPC: file 50 MB, zip 1000 entries, each part 20 MB counted while inflating; only the named Word XML parts read, never macros or embedded objects; own XML scanner: no DTD, five entities and numeric ones, linear; then the same text-node rendering; written only on «Lagre», with the changed-on-disk check. Tauri's drop handler is off in the main window: the webview gets `File` objects, Rust gets no path |
| Export | Rust → Downloads | Overwritten file | Never over an existing file |
| System list (macOS) | System prefs → Rust | Command injection | `/usr/bin/defaults`, `plutil`, `mdfind` by absolute path, arguments without a shell; bundle IDs limited to `[A-Za-z0-9.-]`; read only when a view shows it |
| `innstillinger.json`, `TRIX_ULTRA_DATA_DIR` | Disk, environment → Rust | Bad hotkey or folder | Parsed or rejected; same user's rights; `TRIX_ULTRA_DATA_DIR` is for development and also holds the settings |
| Data folder | Other local accounts | Read the files | Per-user: `~/Library/Application Support/Trix Ultra` (`~/Library` is `700`), `%APPDATA%\Trix Ultra`; `Trix Ultra-data` next to the app only when the user makes it |
| App folder | User-writable folder | Planted DLL (Windows) | Keep the app in its own folder; unsigned |
| Single-instance socket in `/tmp` (macOS) | Other local accounts | Block start | Accepted: needs a hostile account on the same Mac |
| Downloaded build | Distribution | Tampered app | Release assets only from CI on `main` ([build.yml](.github/workflows/build.yml)); macOS: Developer ID and notarized ([sign.sh](scripts/sign.sh)), no release without it; Windows unsigned. Release job: no npm, write token only there; no release before CodeQL (default setup) has passed on the commit or with an open high or critical alert; each release carries an SBOM (SPDX, from GitHub's dependency graph of `main`) |
| Signing secrets in CI | Workflow → certificate, API key | Leaked certificate | Repository secrets, read only on `main` in the job `sign`, which runs Apple tools only ([sign.sh](scripts/sign.sh)), no npm or build code; temporary keychain; files deleted after import; the API key is a revocable team key, not the Apple ID password |

Reverse engineering, memory tampering and debuggers: the binary holds no secret and no licence check, so nothing to protect.
