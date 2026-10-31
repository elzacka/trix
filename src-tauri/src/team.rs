//! The admin's copy for a team: the app beside a copy of its data, in a shared folder or a zip.

use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};

/// In a published data folder: the team's copy shows the content and no editing.
pub const MARK: &str = "publisert.json";

/// The running app: the .app bundle on a Mac, the .exe on Windows.
fn running_app() -> Option<PathBuf> {
    let exe = std::env::current_exe().ok()?;
    if cfg!(target_os = "macos") {
        exe.ancestors().find(|p| p.extension().is_some_and(|e| e == "app")).map(Path::to_path_buf)
    } else {
        Some(exe)
    }
}

/// Empty, or published to before: never over files someone else keeps there.
pub fn check_target(target: &Path, portable: &str) -> Result<(), String> {
    let entries = fs::read_dir(target).map_err(|_| format!("Finner ikke mappen {}", target.display()))?;
    let empty = entries.filter_map(Result::ok).all(|e| e.file_name().to_string_lossy().starts_with('.'));
    if empty || target.join(portable).join(MARK).is_file() {
        Ok(())
    } else {
        Err("Mappen har andre filer. Velg en tom mappe eller en du har publisert til før.".into())
    }
}

/// The files into `<target>/<portable>`, the mark, and the running app beside them.
pub fn publish(files: &[PathBuf], target: &Path, portable: &str, version: &str) -> Result<(), String> {
    let data = target.join(portable);
    fs::create_dir_all(&data).map_err(|e| format!("{}: {e}", data.display()))?;
    for file in files {
        let to = data.join(file.file_name().expect("a file name"));
        fs::copy(file, &to).map_err(|e| format!("{}: {e}", to.display()))?;
    }
    let at = SystemTime::now().duration_since(UNIX_EPOCH).map_or(0, |d| d.as_secs());
    let mark = serde_json::json!({ "versjon": version, "publisert": at });
    fs::write(data.join(MARK), format!("{mark:#}\n")).map_err(|e| format!("{}: {e}", data.display()))?;
    let Some(app) = running_app() else { return Ok(()) };
    let to = target.join(app.file_name().expect("the app's name"));
    if to == app {
        return Ok(());
    }
    if cfg!(target_os = "macos") {
        // ditto keeps the bundle's signature and attributes.
        run(Command::new("/usr/bin/ditto").arg(&app).arg(&to))
    } else {
        fs::copy(&app, &to).map(|_| ()).map_err(|e| format!("{}: {e}", to.display()))
    }
}

/// `folder` as a zip at `zip`, with the folder itself at the top.
pub fn zip(folder: &Path, zip: &Path) -> Result<(), String> {
    if cfg!(target_os = "macos") {
        run(Command::new("/usr/bin/ditto").args(["-c", "-k", "--keepParent"]).arg(folder).arg(zip))
    } else {
        let root = std::env::var_os("SystemRoot").map_or_else(|| PathBuf::from(r"C:\Windows"), PathBuf::from);
        let parent = folder.parent().expect("a parent folder");
        let name = folder.file_name().expect("a folder name");
        run(Command::new(root.join(r"System32\tar.exe")).args(["-a", "-c", "-f"]).arg(zip).arg("-C").arg(parent).arg(name))
    }
}

fn run(command: &mut Command) -> Result<(), String> {
    let output = command.output().map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

/// A folder name from the app's name in the setup.
pub fn folder_name(name: &str) -> String {
    let clean: String = name.chars().filter(|c| !r#"/\:*?"<>|"#.contains(*c) && !c.is_control()).collect();
    let clean = clean.trim().trim_start_matches('.').trim();
    if clean.is_empty() { "Trix Ultra".into() } else { clean.into() }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn publishes_only_into_an_empty_or_earlier_folder() {
        let dir = std::env::temp_dir().join(format!("trix-ultra-team-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();
        assert!(check_target(&dir, "data").is_ok());
        fs::write(dir.join("rapport.docx"), "x").unwrap();
        assert!(check_target(&dir, "data").is_err());
        fs::create_dir_all(dir.join("data")).unwrap();
        fs::write(dir.join("data").join(MARK), "{}").unwrap();
        assert!(check_target(&dir, "data").is_ok());
        assert!(check_target(&dir.join("finnes ikke"), "data").is_err());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn publishing_copies_the_files_and_marks_the_copy() {
        let dir = std::env::temp_dir().join(format!("trix-ultra-publish-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        let (source, target) = (dir.join("admin"), dir.join("team"));
        fs::create_dir_all(&source).unwrap();
        fs::create_dir_all(&target).unwrap();
        fs::write(source.join("Oppsett.md"), "# Oppsett").unwrap();
        fs::write(source.join("Kort.md"), "# Kort").unwrap();
        publish(&[source.join("Oppsett.md"), source.join("Kort.md")], &target, "data", "0.1.0").unwrap();
        assert_eq!(fs::read_to_string(target.join("data/Kort.md")).unwrap(), "# Kort");
        assert!(target.join("data").join(MARK).is_file());
        assert!(check_target(&target, "data").is_ok());
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn folder_names_are_plain() {
        assert_eq!(folder_name("Team: «Verktøy»/A"), "Team «Verktøy»A");
        assert_eq!(folder_name(" ../ "), "Trix Ultra");
    }
}
