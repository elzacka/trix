#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, RunEvent, WindowEvent,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;

/// The lists Trix writes when a file is missing; after that the files are the user's.
const FILES: [(&str, &str); 2] = [
    ("Hurtigtaster.md", include_str!("../../seed/Hurtigtaster.md")),
    ("Jukselapp.md", include_str!("../../seed/Jukselapp.md")),
];
const SETTINGS: &str = "innstillinger.json";
const DEFAULT_HOTKEY: &str = "CommandOrControl+Alt+T";

#[derive(Serialize, Deserialize, Default)]
struct Settings {
    /// None: the default. Empty: no hotkey.
    #[serde(rename = "hurtigtast", skip_serializing_if = "Option::is_none")]
    hotkey: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Loaded {
    os: &'static str,
    folder: String,
    files: Vec<String>,
    hotkey: String,
    hotkey_taken: bool,
}

/// The folder Trix sits in, so the lists travel with it: next to Trix.exe, or next to Trix.app.
fn data_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os("TRIX_DATA_DIR") {
        return dir.into();
    }
    let exe = std::env::current_exe().expect("path of the running app");
    let bundle = exe.ancestors().find(|p| p.extension().is_some_and(|e| e == "app"));
    bundle.unwrap_or(&exe).parent().expect("folder of the app").to_path_buf()
}

fn file_path(name: &str) -> Result<PathBuf, String> {
    FILES
        .iter()
        .find(|(file, _)| *file == name)
        .map(|(file, _)| data_dir().join(file))
        .ok_or_else(|| format!("Ukjent fil: {name}"))
}

fn io_error(path: &Path, error: std::io::Error) -> String {
    match error.kind() {
        ErrorKind::PermissionDenied | ErrorKind::ReadOnlyFilesystem => {
            format!("Trix har ikke tilgang til {}", path.display())
        }
        _ => format!("{}: {error}", path.display()),
    }
}

fn read_or_seed(path: &Path, seed: &str) -> Result<String, String> {
    match fs::read_to_string(path) {
        Err(e) if e.kind() == ErrorKind::NotFound => {
            fs::write(path, seed).map_err(|e| io_error(path, e))?;
            Ok(seed.to_string())
        }
        result => result.map_err(|e| io_error(path, e)),
    }
}

fn settings() -> Settings {
    fs::read_to_string(data_dir().join(SETTINGS))
        .ok()
        .and_then(|text| serde_json::from_str(&text).ok())
        .unwrap_or_default()
}

fn current_hotkey() -> String {
    settings().hotkey.unwrap_or_else(|| DEFAULT_HOTKEY.into())
}

#[tauri::command]
fn load(app: AppHandle) -> Result<Loaded, String> {
    let dir = data_dir();
    // A downloaded app that macOS runs from a hidden, read-only copy cannot see its own folder.
    if dir.to_string_lossy().contains("/AppTranslocation/") {
        return Err("Flytt Trix til en annen mappe i Finder, og åpne Trix på nytt".into());
    }
    let files = FILES
        .iter()
        .map(|(name, seed)| read_or_seed(&dir.join(name), seed))
        .collect::<Result<_, _>>()?;
    let hotkey = current_hotkey();
    let hotkey_taken = !hotkey.is_empty()
        && !app.global_shortcut().is_registered(hotkey.as_str());
    Ok(Loaded {
        os: if cfg!(target_os = "macos") { "mac" } else { "windows" },
        folder: dir.display().to_string(),
        files,
        hotkey,
        hotkey_taken,
    })
}

/// Refuses when the file changed on disk since `original` was read, so nothing is lost.
#[tauri::command]
fn save(name: String, original: String, text: String) -> Result<String, String> {
    let path = file_path(&name)?;
    let current = fs::read_to_string(&path).map_err(|e| io_error(&path, e))?;
    if current != original {
        return Err("changed".into());
    }
    let text = if original.contains("\r\n") { text.replace('\n', "\r\n") } else { text };
    let temp = path.with_extension("md.tmp");
    fs::write(&temp, &text).map_err(|e| io_error(&temp, e))?;
    fs::rename(&temp, &path).map_err(|e| io_error(&path, e))?;
    Ok(text)
}

#[tauri::command]
fn open_file(app: AppHandle, name: String) -> Result<(), String> {
    let path = file_path(&name)?;
    app.opener().open_path(path.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}

#[tauri::command]
fn reveal_file(app: AppHandle, name: String) -> Result<(), String> {
    app.opener().reveal_item_in_dir(file_path(&name)?).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    if !url.starts_with("https://") && !url.starts_with("http://") {
        return Err("Bare nettadresser".into());
    }
    app.opener().open_url(url, None::<&str>).map_err(|e| e.to_string())
}

fn register(app: &AppHandle, hotkey: &str) -> Result<(), String> {
    let shortcuts = app.global_shortcut();
    let _ = shortcuts.unregister_all();
    if hotkey.is_empty() {
        return Ok(());
    }
    shortcuts
        .on_shortcut(hotkey, |app, _, event| {
            if event.state == ShortcutState::Pressed {
                toggle(app);
            }
        })
        .map_err(|e| e.to_string())
}

/// Keeps the old hotkey when the new one cannot be registered.
#[tauri::command]
fn set_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    if let Err(error) = register(&app, &hotkey) {
        let _ = register(&app, &current_hotkey());
        return Err(error);
    }
    let path = data_dir().join(SETTINGS);
    let json = serde_json::to_string_pretty(&Settings { hotkey: Some(hotkey) }).expect("settings as JSON");
    fs::write(&path, json + "\n").map_err(|e| io_error(&path, e))
}

fn show(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else { return };
    #[cfg(target_os = "macos")]
    let _ = app.show();
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
    let _ = app.emit("opened", ());
}

/// On a Mac, hiding the app hands focus back to the app the user came from.
#[tauri::command]
fn hide(app: AppHandle) {
    #[cfg(target_os = "macos")]
    let _ = app.hide();
    #[cfg(not(target_os = "macos"))]
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn toggle(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else { return };
    if window.is_visible().unwrap_or(false) && window.is_focused().unwrap_or(false) {
        hide(app.clone());
    } else {
        show(app);
    }
}

#[tauri::command]
fn quit(app: AppHandle) {
    app.exit(0);
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load, save, open_file, reveal_file, open_url, set_hotkey, hide, quit
        ])
        .setup(|app| {
            #[cfg(target_os = "macos")]
            app.set_activation_policy(tauri::ActivationPolicy::Accessory);

            let _ = register(app.handle(), &current_hotkey());

            let open = MenuItem::with_id(app, "open", "Åpne Trix", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Avslutt Trix", true, None::<&str>)?;
            let icon = if cfg!(target_os = "macos") {
                Image::from_bytes(include_bytes!("../icons/tray.png"))?
            } else {
                app.default_window_icon().cloned().expect("app icon")
            };
            TrayIconBuilder::with_id("tray")
                .icon(icon)
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("Trix")
                .menu(&Menu::with_items(app, &[&open, &quit])?)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show(app),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left, button_state: MouseButtonState::Up, ..
                    } = event
                    {
                        toggle(tray.app_handle());
                    }
                })
                .build(app)?;
            show(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                hide(window.app_handle().clone());
            }
        })
        .build(tauri::generate_context!())
        .expect("Trix starts")
        .run(|app, event| {
            if let RunEvent::Reopen { .. } = event {
                show(app);
            }
        });
}
