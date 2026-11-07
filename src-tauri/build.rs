// Each window gets only the commands its capability names (`capabilities/`).
const COMMANDS: &[&str] = &[
    "load", "read_content", "system_list", "save", "reveal_file", "open_guide", "open_url", "set_hotkey", "set_view", "set_tray",
    "set_size", "set_tray_icon", "read_icon", "export_content", "hold", "hide", "quit", "set_mode", "set_app_icon",
    "open_setup", "read_setup", "save_setup", "open_setup_file", "add_icon", "read_dropped",
];

fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)))
        .expect("tauri build");
}
