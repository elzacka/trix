# Security

Report a vulnerability: hei@tazk.no.

## Threat model

One process with the user's rights, no elevated parts, no network, no listening port.

| Entry point                                                    | Trust boundary           | Threat                                     | Mitigation                                                                                                                               |
| -------------------------------------------------------------- | ------------------------ | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `Hurtigtaster.md`, `Jukselapp.md` (may come from someone else) | File → webview           | Script in the list                         | Text nodes only, CSP `'self'`; links `https?://` only                                                                                    |
| Links in the list                                              | Webview → browser        | Web page in the panel                      | `on_navigation`: own origin only; `on_new_window`: deny; http(s) goes to the browser                                                     |
| IPC from the panel                                             | Webview → Rust           | File access beyond the lists               | Only Trix's own commands; file names from a fixed list; `open_url` http(s) only; remote pages get no IPC (Tauri, no `remote` capability) |
| `innstillinger.json`, `TRIX_DATA_DIR`                          | Disk, environment → Rust | Bad hotkey or folder                       | Parsed or rejected; same user's rights                                                                                                   |
| App folder                                                     | User-writable folder     | Planted DLL (Windows)                      | Keep Trix in its own `Trix\` folder; unsigned                                                                                            |
| Single-instance socket `/tmp/no_tazk_trix_si.sock` (macOS)     | Other local accounts     | Block start, read the app's working folder | Accepted: needs a hostile account on the same Mac                                                                                        |
| Downloaded build                                               | Distribution             | Tampered app                               | macOS: Developer ID, notarized ([build.sh](scripts/build.sh)); Windows: unsigned; CI builds both from `main` ([build.yml](.github/workflows/build.yml)) |

Reverse engineering, memory tampering and debuggers: the binary holds no secret and no licence check, so nothing to protect.
