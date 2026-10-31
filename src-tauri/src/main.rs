#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs,
    io::ErrorKind,
    path::{Path, PathBuf},
    sync::{
        Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::{Duration, Instant},
};

use serde::{Deserialize, Serialize};
use tauri::{
    AppHandle, Emitter, Manager, Monitor, PhysicalPosition, WebviewWindow, WebviewWindowBuilder,
    WindowEvent,
    image::Image,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    webview::{NewWindowResponse, Url},
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_opener::OpenerExt;

mod system;

#[cfg(target_os = "macos")]
use tauri::RunEvent;

/// Written when missing; after that the files are the user's.
const SETUP: (&str, &str) = ("Oppsett.md", include_str!("../../seed/Oppsett.md"));
/// One template per view type; `{navn}` becomes the view's name.
const TEMPLATES: [(&str, &str); 4] = [
    ("hurtigtaster", include_str!("../../seed/maler/hurtigtaster.md")),
    ("oppslag", include_str!("../../seed/maler/oppslag.md")),
    ("kort", include_str!("../../seed/maler/kort.md")),
    ("artikler", include_str!("../../seed/maler/artikler.md")),
];
const SETTINGS: &str = "innstillinger.json";
/// A folder by this name next to the app holds the files instead, so they travel with it.
const PORTABLE: &str = "Trix Ultra-data";
const DEFAULT_HOTKEY: &str = "CommandOrControl+Alt+U";

#[derive(Serialize, Deserialize, Default)]
struct Settings {
    /// None: the default. Empty: no hotkey.
    #[serde(rename = "hurtigtast", skip_serializing_if = "Option::is_none")]
    hotkey: Option<String>,
    /// Which shortcuts the list shows: None or «mine», «system», «begge».
    #[serde(rename = "vis", skip_serializing_if = "Option::is_none")]
    view: Option<String>,
}

const VIEWS: [&str; 3] = ["mine", "system", "begge"];

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Loaded {
    os: &'static str,
    version: &'static str,
    setup: String,
    hotkey: String,
    hotkey_taken: bool,
    view: String,
}

/// The folder the app sits in: next to the .exe, or next to the .app.
fn app_dir() -> PathBuf {
    let exe = std::env::current_exe().expect("path of the running app");
    let bundle = exe.ancestors().find(|p| p.extension().is_some_and(|e| e == "app"));
    bundle.unwrap_or(&exe).parent().expect("folder of the app").to_path_buf()
}

/// The user's app data folder, which needs no permission prompt and no cloud sync.
fn user_dir() -> PathBuf {
    if cfg!(target_os = "macos") {
        PathBuf::from(std::env::var_os("HOME").expect("HOME")).join("Library/Application Support/Trix Ultra")
    } else {
        PathBuf::from(std::env::var_os("APPDATA").expect("APPDATA")).join("Trix Ultra")
    }
}

fn data_dir() -> PathBuf {
    if let Some(dir) = std::env::var_os("TRIX_ULTRA_DATA_DIR") {
        return dir.into();
    }
    let portable = app_dir().join(PORTABLE);
    if portable.is_dir() { portable } else { user_dir() }
}

/// A plain name in the data folder with one of `extensions`, as `ui/parse.js` checks it: never a path out of it.
fn data_file(name: &str, extensions: &[&str]) -> Result<PathBuf, String> {
    let plain = Path::new(name).file_name().is_some_and(|n| n == name)
        && !name.starts_with('.')
        && !name.contains(['/', '\\', ':'])
        && extensions.iter().any(|e| name.to_lowercase().ends_with(e));
    if plain { Ok(data_dir().join(name)) } else { Err(format!("Ukjent fil: {name}")) }
}

fn file_path(name: &str) -> Result<PathBuf, String> {
    data_file(name, &[".md"])
}

/// Larger icons are a mistake, and the panel reads them each time it opens.
const ICON_LIMIT: u64 = 1024 * 1024;

fn read_image(name: &str, extensions: &[&str]) -> Result<Vec<u8>, String> {
    let path = data_file(name, extensions)?;
    let size = fs::metadata(&path).map_err(|e| io_error(&path, e))?.len();
    if size > ICON_LIMIT {
        return Err(format!("{name} er større enn 1 MB"));
    }
    fs::read(&path).map_err(|e| io_error(&path, e))
}

fn io_error(path: &Path, error: std::io::Error) -> String {
    match error.kind() {
        ErrorKind::PermissionDenied | ErrorKind::ReadOnlyFilesystem => {
            format!("Appen har ikke tilgang til {}", path.display())
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

fn write_settings(settings: &Settings) -> Result<(), String> {
    let path = data_dir().join(SETTINGS);
    let json = serde_json::to_string_pretty(settings).expect("settings as JSON");
    fs::write(&path, json + "\n").map_err(|e| io_error(&path, e))
}

fn current_hotkey() -> String {
    settings().hotkey.unwrap_or_else(|| DEFAULT_HOTKEY.into())
}

fn current_view() -> String {
    settings().view.filter(|v| VIEWS.contains(&v.as_str())).unwrap_or_else(|| VIEWS[0].into())
}

#[tauri::command]
fn load(app: AppHandle) -> Result<Loaded, String> {
    let dir = data_dir();
    fs::create_dir_all(&dir).map_err(|e| io_error(&dir, e))?;
    let setup = read_or_seed(&dir.join(SETUP.0), SETUP.1)?;
    let hotkey = current_hotkey();
    let hotkey_taken = !hotkey.is_empty()
        && !app.global_shortcut().is_registered(hotkey.as_str());
    Ok(Loaded {
        os: if cfg!(target_os = "macos") { "mac" } else { "windows" },
        version: env!("CARGO_PKG_VERSION"),
        setup,
        hotkey,
        hotkey_taken,
        view: current_view(),
    })
}

/// A view's file; a missing one starts as the template for its type.
#[tauri::command]
fn read_list(name: String, kind: String, title: String) -> Result<String, String> {
    let template = TEMPLATES
        .iter()
        .find(|(k, _)| *k == kind)
        .map(|(_, text)| text.replace("{navn}", &title))
        .ok_or_else(|| format!("Ukjent type: {kind}"))?;
    read_or_seed(&file_path(&name)?, &template)
}

/// The system's shortcuts in the format of a hurtigtaster file; read only when a view shows them.
#[tauri::command]
fn system_list() -> Result<String, String> {
    system::list()
}

#[tauri::command]
fn set_view(view: String) -> Result<(), String> {
    if !VIEWS.contains(&view.as_str()) {
        return Err(format!("Ukjent visning: {view}"));
    }
    write_settings(&Settings { view: Some(view), ..settings() })
}

/// A copy of the user's list in Downloads, shown in Finder or Explorer; never over an existing file.
#[tauri::command]
fn export_list(app: AppHandle, name: String) -> Result<(), String> {
    let source = file_path(&name)?;
    let stem = name.trim_end_matches(".md");
    let folder = app.path().download_dir().map_err(|e| e.to_string())?;
    let target = (1..)
        .map(|n| folder.join(if n == 1 { name.clone() } else { format!("{stem} {n}.md") }))
        .find(|path| !path.exists())
        .expect("a free name");
    fs::copy(&source, &target).map_err(|e| io_error(&target, e))?;
    app.opener().reveal_item_in_dir(target).map_err(|e| e.to_string())
}

/// Refuses when the file changed on disk since `original` was read, so nothing is lost.
#[tauri::command]
fn save(name: String, original: String, text: String) -> Result<String, String> {
    let path = file_path(&name)?;
    // Through a symbolic link: replace the file it points to, so the link stays.
    let path = if path.is_symlink() { fs::canonicalize(&path).unwrap_or(path) } else { path };
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

/// An icon from the setup, as bytes; the panel shows it as an image, never as markup.
#[tauri::command]
fn read_icon(name: String) -> Result<tauri::ipc::Response, String> {
    read_image(&name, &[".svg", ".png"]).map(tauri::ipc::Response::new)
}

/// The tray icon from the setup, or the app's own. On a Mac a template follows the menu bar's colour; `color` keeps the file's.
#[tauri::command]
fn set_tray_icon(app: AppHandle, name: Option<String>, color: bool) -> Result<(), String> {
    let tray = app.tray_by_id("tray").ok_or("tray")?;
    let icon = match name {
        Some(name) => Image::from_bytes(&read_image(&name, &[".png"])?).map_err(|e| format!("{name}: {e}"))?,
        None => default_tray_icon(&app),
    };
    tray.set_icon(Some(icon)).map_err(|e| e.to_string())?;
    tray.set_icon_as_template(cfg!(target_os = "macos") && !color).map_err(|e| e.to_string())
}

fn default_tray_icon(app: &AppHandle) -> Image<'static> {
    if cfg!(target_os = "macos") {
        Image::from_bytes(include_bytes!("../icons/tray.png")).expect("tray icon")
    } else {
        app.default_window_icon().cloned().expect("app icon").to_owned()
    }
}

/// The tray icon's tooltip and menu in the names the setup gives.
#[tauri::command]
fn set_tray(app: AppHandle, name: String, open: String, quit: String) -> Result<(), String> {
    let tray = app.tray_by_id("tray").ok_or("tray")?;
    let open = MenuItem::with_id(&app, "open", open, true, None::<&str>).map_err(|e| e.to_string())?;
    let quit = MenuItem::with_id(&app, "quit", quit, true, None::<&str>).map_err(|e| e.to_string())?;
    let menu = Menu::with_items(&app, &[&open, &quit]).map_err(|e| e.to_string())?;
    tray.set_menu(Some(menu)).map_err(|e| e.to_string())?;
    tray.set_tooltip(Some(name)).map_err(|e| e.to_string())
}

/// The panel's size from the setup, placed again at the tray icon.
#[tauri::command]
fn set_size(app: AppHandle, width: f64, height: f64) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("window")?;
    let size = tauri::LogicalSize::new(width.clamp(320.0, 1200.0), height.clamp(400.0, 1000.0));
    if window.inner_size().ok().map(|s| s.to_logical::<f64>(window.scale_factor().unwrap_or(1.0))) == Some(size) {
        return Ok(());
    }
    window.set_size(size).map_err(|e| e.to_string())?;
    if window.is_visible().unwrap_or(false) {
        place(&app, &window);
    }
    Ok(())
}

/// Keeps the old hotkey when the new one cannot be registered.
#[tauri::command]
fn set_hotkey(app: AppHandle, hotkey: String) -> Result<(), String> {
    if let Err(error) = register(&app, &hotkey) {
        let _ = register(&app, &current_hotkey());
        return Err(error);
    }
    write_settings(&Settings { hotkey: Some(hotkey), ..settings() })
}

/// Set while a file dialog has focus, so the panel stays open behind it.
struct Holding(AtomicBool);

#[tauri::command]
fn hold(holding: tauri::State<Holding>) {
    holding.0.store(true, Ordering::Relaxed);
}

/// When the panel last hid because it lost focus, so the tray click that caused it does not reopen it.
struct LastHidden(Mutex<Option<Instant>>);

/// Under the icon at the top of the screen (macOS menu bar), above it at the bottom (Windows tray).
fn place(app: &AppHandle, window: &WebviewWindow) {
    let scale = window.scale_factor().unwrap_or(1.0);
    let Ok(panel) = window.outer_size() else { return };
    // Right after launch the icon is not laid out yet and reports no height.
    let icon = app
        .tray_by_id("tray")
        .and_then(|tray| tray.rect().ok().flatten())
        .map(|rect| (rect.position.to_physical::<f64>(scale), rect.size.to_physical::<f64>(scale)))
        .filter(|(_, size)| size.height > 0.0);
    let monitors = window.available_monitors().unwrap_or_default();
    let contains = |monitor: &&Monitor, x: f64, y: f64| {
        let (p, s) = (monitor.position(), monitor.size());
        (f64::from(p.x)..f64::from(p.x) + f64::from(s.width)).contains(&x)
            && (f64::from(p.y)..f64::from(p.y) + f64::from(s.height)).contains(&y)
    };
    let monitor = icon
        .and_then(|(at, _)| monitors.iter().find(|m| contains(m, at.x, at.y)).cloned())
        .or_else(|| window.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else { return };
    let area = monitor.work_area();
    let (left, top) = (f64::from(area.position.x), f64::from(area.position.y));
    let (right, bottom) = (left + f64::from(area.size.width), top + f64::from(area.size.height));
    let (width, height) = (f64::from(panel.width), f64::from(panel.height));
    let gap = 6.0 * scale;
    // Without the icon: the corner where it sits.
    let (x, y, icon_width, icon_height) = match icon {
        Some((at, size)) => (at.x, at.y, size.width, size.height),
        None if cfg!(target_os = "macos") => (right, top - 1.0, 0.0, 0.0),
        None => (right, bottom, 0.0, 0.0),
    };
    let below = y < (top + bottom) / 2.0;
    let x = (x + icon_width / 2.0 - width / 2.0).min(right - width - gap).max(left + gap);
    let y = if below { y + icon_height + gap } else { y - height - gap };
    let y = y.min(bottom - height).max(top);
    #[allow(clippy::cast_possible_truncation)]
    let _ = window.set_position(PhysicalPosition::new(x.round() as i32, y.round() as i32));
}

/// Rounded like other Mac windows: a borderless window has square corners of its own.
#[cfg(target_os = "macos")]
fn round_corners(window: &WebviewWindow) {
    use objc2_app_kit::{NSColor, NSWindow};
    let Ok(pointer) = window.ns_window() else { return };
    // SAFETY: Tauri's live NSWindow, used on the main thread during setup.
    let ns_window = unsafe { &*pointer.cast::<NSWindow>() };
    ns_window.setOpaque(false);
    ns_window.setBackgroundColor(Some(&NSColor::clearColor()));
    let Some(view) = ns_window.contentView() else { return };
    view.setWantsLayer(true);
    if let Some(layer) = view.layer() {
        layer.setCornerRadius(16.0);
        layer.setMasksToBounds(true);
    }
    ns_window.invalidateShadow();
}

fn show(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else { return };
    place(app, &window);
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

/// The panel shows only the app; links that would open in it go to the browser.
fn build_panel(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    let dev = app.config().build.dev_url.clone();
    let (navigating, opening) = (app.clone(), app.clone());
    WebviewWindowBuilder::from_config(app, &app.config().app.windows[0])?
        .on_navigation(move |url| {
            let own = own_page(url) || dev.as_ref().is_some_and(|dev| dev.origin() == url.origin());
            if !own {
                to_browser(&navigating, url);
            }
            own
        })
        .on_new_window(move |url, _| {
            to_browser(&opening, &url);
            NewWindowResponse::Deny
        })
        .build()
}

/// The origin Tauri serves the app from; any other port or scheme on that host is a local server.
fn own_page(url: &Url) -> bool {
    let (scheme, host) = if cfg!(windows) { ("http", "tauri.localhost") } else { ("tauri", "localhost") };
    url.scheme() == scheme && url.host_str() == Some(host) && url.port().is_none()
}

fn to_browser(app: &AppHandle, url: &Url) {
    if matches!(url.scheme(), "http" | "https") {
        let _ = app.opener().open_url(url.as_str(), None::<&str>);
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _, _| show(app)))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load, read_list, system_list, save, reveal_file, open_url, set_hotkey, set_view, set_tray,
            set_size, set_tray_icon, read_icon, export_list, hold, hide, quit
        ])
        .manage(LastHidden(Mutex::new(None)))
        .manage(Holding(AtomicBool::new(false)))
        .setup(|app| {
            build_panel(app.handle())?;
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Accessory);
                if let Some(window) = app.get_webview_window("main") {
                    round_corners(&window);
                }
            }

            let _ = register(app.handle(), &current_hotkey());

            let open = MenuItem::with_id(app, "open", "Åpne Trix Ultra", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Avslutt Trix Ultra", true, None::<&str>)?;
            TrayIconBuilder::with_id("tray")
                .icon(default_tray_icon(app.handle()))
                .icon_as_template(cfg!(target_os = "macos"))
                .tooltip("Trix Ultra")
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
                        let app = tray.app_handle();
                        let hidden = *app.state::<LastHidden>().0.lock().expect("lock");
                        if !hidden.is_some_and(|at| at.elapsed() < Duration::from_millis(400)) {
                            toggle(app);
                        }
                    }
                })
                .build(app)?;
            show(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } => {
                api.prevent_close();
                hide(window.app_handle().clone());
            }
            // A panel, like a menu: it closes when the user clicks elsewhere.
            WindowEvent::Focused(false) => {
                if window.state::<Holding>().0.swap(false, Ordering::Relaxed) {
                    return;
                }
                *window.state::<LastHidden>().0.lock().expect("lock") = Some(Instant::now());
                hide(window.app_handle().clone());
            }
            WindowEvent::Focused(true) => window.state::<Holding>().0.store(false, Ordering::Relaxed),
            _ => {}
        })
        .build(tauri::generate_context!())
        .expect("the app starts")
        .run(|_app, _event| {
            #[cfg(target_os = "macos")]
            if let RunEvent::Reopen { .. } = _event {
                show(_app);
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn file_names_stay_in_the_data_folder() {
        for name in ["Hurtigtaster.md", "Slik gjør du.md", "a.MD"] {
            assert_eq!(file_path(name).unwrap(), data_dir().join(name));
        }
        for name in ["../a.md", "a/b.md", "a\\b.md", "C:a.md", ".a.md", "a.txt", "", "innstillinger.json"] {
            assert!(file_path(name).is_err(), "{name}");
        }
        assert!(data_file("logo.SVG", &[".svg", ".png"]).is_ok());
        assert!(data_file("../logo.png", &[".svg", ".png"]).is_err() && data_file("logo.md", &[".png"]).is_err());
    }

    #[test]
    fn templates_start_with_the_views_name() {
        for (kind, text) in TEMPLATES {
            assert!(text.starts_with("# {navn}\n"), "{kind}");
        }
    }
}
