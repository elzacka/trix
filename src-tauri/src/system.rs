//! The system's shortcuts, written in the format of `Hurtigtaster.md`.

#[cfg(not(target_os = "macos"))]
pub fn list() -> Result<String, String> {
    Ok(include_str!("../../system/Windows.md").into())
}

#[cfg(target_os = "macos")]
pub use mac::list;

#[cfg(target_os = "macos")]
mod mac {
    use std::{
        io::Write,
        process::{Command, Stdio},
    };

    use serde_json::{Map, Value};

    /// Where System Settings keeps its table of shortcuts, their defaults and their names.
    const KEYBOARD: &str = "/System/Library/ExtensionKit/Extensions/KeyboardSettings.appex/Contents/Resources";
    const SHIFT: u64 = 0x2_0000;
    const CTRL: u64 = 0x4_0000;
    const ALT: u64 = 0x8_0000;
    const CMD: u64 = 0x10_0000;
    const FN: u64 = 0x80_0000;
    const NO_KEY: u64 = 65535;

    fn run(program: &str, args: &[&str], input: Option<&[u8]>) -> Option<Vec<u8>> {
        let mut child = Command::new(program)
            .args(args)
            .stdin(if input.is_some() { Stdio::piped() } else { Stdio::null() })
            .stdout(Stdio::piped())
            .stderr(Stdio::null())
            .spawn()
            .ok()?;
        if let Some(input) = input {
            child.stdin.take()?.write_all(input).ok()?;
        }
        let output = child.wait_with_output().ok()?;
        output.status.success().then_some(output.stdout)
    }

    fn plist(args: &[&str], input: Option<&[u8]>) -> Option<Value> {
        serde_json::from_slice(&run("/usr/bin/plutil", args, input)?).ok()
    }

    /// One key of a preference domain, as macOS has it now (cfprefsd, not the file on disk).
    fn preference(domain: &str, key: &str) -> Option<Value> {
        let exported = run("/usr/bin/defaults", &["export", domain, "-"], None)?;
        plist(&["-extract", key, "json", "-o", "-", "-"], Some(&exported))
    }

    fn key_word(code: u64) -> Option<&'static str> {
        Some(match code {
            36 => "retur",
            48 => "tab",
            49 => "mellomrom",
            51 => "slett",
            53 => "esc",
            117 => "delete",
            123 => "venstre",
            124 => "høyre",
            125 => "ned",
            126 => "opp",
            122 => "F1",
            120 => "F2",
            99 => "F3",
            118 => "F4",
            96 => "F5",
            97 => "F6",
            98 => "F7",
            100 => "F8",
            101 => "F9",
            109 => "F10",
            103 => "F11",
            111 => "F12",
            105 => "F13",
            107 => "F14",
            113 => "F15",
            _ => return None,
        })
    }

    fn escape(text: &str) -> String {
        text.replace('|', "\\|")
    }

    /// `(character, key code, modifiers)` as macOS stores a system shortcut; None for no key.
    fn keys(character: u64, code: u64, modifiers: u64) -> Option<String> {
        let key = match char::from_u32(u32::try_from(character).ok()?) {
            Some(' ') => "mellomrom".to_string(),
            Some(c) if c.is_ascii_graphic() => escape(&c.to_ascii_uppercase().to_string()),
            _ => key_word(code)?.to_string(),
        };
        Some(modifier_words(modifiers, &key))
    }

    /// In the order System Settings shows them: ⌃⌥⇧⌘.
    fn modifier_words(modifiers: u64, key: &str) -> String {
        [(FN, "fn"), (CTRL, "ctrl"), (ALT, "alt"), (SHIFT, "shift"), (CMD, "cmd")]
            .iter()
            .filter(|(flag, _)| modifiers & flag != 0)
            .map(|(_, word)| *word)
            .chain([key])
            .collect::<Vec<_>>()
            .join(" ")
    }

    /// A menu key equivalent from App Shortcuts: `@` ⌘, `^` ⌃, `~` ⌥, `$` ⇧, then the key.
    fn menu_keys(equivalent: &str) -> Option<String> {
        let mut modifiers = 0;
        let mut rest = equivalent;
        while let Some(c) = rest.chars().next().filter(|_| rest.chars().count() > 1) {
            modifiers |= match c {
                '@' => CMD,
                '^' => CTRL,
                '~' => ALT,
                '$' => SHIFT,
                _ => break,
            };
            rest = &rest[c.len_utf8()..];
        }
        let mut chars = rest.chars();
        let (Some(c), None) = (chars.next(), chars.next()) else { return None };
        let key = match c {
            '←' => "venstre".into(),
            '→' => "høyre".into(),
            '↑' => "opp".into(),
            '↓' => "ned".into(),
            ' ' => "mellomrom".into(),
            '\r' | '↩' => "retur".into(),
            '\t' | '⇥' => "tab".into(),
            '\u{1b}' | '⎋' => "esc".into(),
            '\u{8}' | '\u{7f}' | '⌫' => "slett".into(),
            '\u{f728}' | '⌦' => "delete".into(),
            '\u{f704}'..='\u{f70f}' => format!("F{}", u32::from(c) - 0xf703),
            c if c.is_ascii_graphic() => escape(&c.to_ascii_uppercase().to_string()),
            _ => return None,
        };
        Some(modifier_words(modifiers, &key))
    }

    struct Group {
        title: String,
        lines: Vec<String>,
    }

    fn as_u64(value: Option<&Value>) -> Option<u64> {
        value.and_then(Value::as_u64)
    }

    /// The table's English name with the marker System Settings leaves on it, in Norwegian.
    fn name(node: &Map<String, Value>, names: &Map<String, Value>) -> Option<String> {
        let english = node.get("name")?.as_str()?.trim_start_matches("DO_NOT_LOCALIZE: ");
        Some(names.get(english).and_then(Value::as_str).unwrap_or(english).to_string())
    }

    /// The shortcut as the user has it: their setting when there is one, else the table's default.
    fn line(node: &Map<String, Value>, enabled: bool, names: &Map<String, Value>, set: &Map<String, Value>) -> Option<String> {
        let id = as_u64(node.get("sybmolichotkey"))?;
        // Settings shows these only on hardware or languages that have them.
        let identifier = node.get("identifier").and_then(Value::as_str).unwrap_or_default();
        if identifier.starts_with("touchbar.") || node.get("showEnable").and_then(Value::as_bool) == Some(false) {
            return None;
        }
        let (on, character, code, modifiers) = match set.get(&id.to_string()).and_then(Value::as_object) {
            Some(own) => {
                let parameters = own.get("value").and_then(|v| v.get("parameters")).and_then(Value::as_array);
                let at = |i: usize| as_u64(parameters.and_then(|p| p.get(i)));
                (own.get("enabled").and_then(Value::as_bool)?, at(0)?, at(1)?, at(2)?)
            }
            None => (
                enabled && node.get("enabled").and_then(Value::as_bool).unwrap_or(true),
                as_u64(node.get("charKey")).unwrap_or(NO_KEY),
                as_u64(node.get("key")).unwrap_or(NO_KEY),
                as_u64(node.get("modifier")).unwrap_or(0),
            ),
        };
        if !on || (code == NO_KEY && character == NO_KEY) {
            return None;
        }
        Some(format!("- {} | {}", escape(&name(node, names)?), keys(character, code, modifiers)?))
    }

    fn collect(node: &Map<String, Value>, enabled: bool, names: &Map<String, Value>, set: &Map<String, Value>, out: &mut Vec<String>) {
        let enabled = enabled && node.get("enabled").and_then(Value::as_bool).unwrap_or(true);
        out.extend(line(node, enabled, names, set));
        for child in node.get("elements").and_then(Value::as_array).into_iter().flatten() {
            if let Some(child) = child.as_object() {
                collect(child, enabled, names, set, out);
            }
        }
    }

    fn app_name(bundle: &str) -> Option<String> {
        if !bundle.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '-') {
            return None;
        }
        let found = run("/usr/bin/mdfind", &[&format!("kMDItemCFBundleIdentifier == '{bundle}'")], None)?;
        let path = String::from_utf8(found).ok()?;
        let app = std::path::Path::new(path.lines().next()?);
        Some(app.file_stem()?.to_string_lossy().into_owned())
    }

    /// The apps that have App Shortcuts, as System Settings lists them.
    fn custom_menu_apps() -> Vec<String> {
        let Some(text) = run("/usr/bin/defaults", &["read", "com.apple.universalaccess", "com.apple.custommenu.apps"], None) else {
            return vec!["NSGlobalDomain".into()];
        };
        let mut apps: Vec<String> = String::from_utf8_lossy(&text)
            .split([',', '\n', '(', ')'])
            .map(|s| s.trim().trim_matches('"').to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if !apps.iter().any(|a| a == "NSGlobalDomain") {
            apps.insert(0, "NSGlobalDomain".into());
        }
        apps
    }

    fn app_shortcuts(names: &Map<String, Value>, title: &str) -> Vec<Group> {
        custom_menu_apps()
            .iter()
            .filter_map(|domain| {
                let Some(Value::Object(menus)) = preference(domain, "NSUserKeyEquivalents") else { return None };
                let app = if domain == "NSGlobalDomain" {
                    names.get("All Applications").and_then(Value::as_str).unwrap_or("Alle apper").to_string()
                } else {
                    app_name(domain).unwrap_or_else(|| domain.clone())
                };
                let lines = menus
                    .iter()
                    .filter_map(|(menu, keys)| {
                        // A menu inside a menu is a path: ESC, then each title.
                        let item = menu.rsplit('\u{1b}').next().unwrap_or(menu);
                        Some(format!("- {} | {}", escape(item), menu_keys(keys.as_str()?)?))
                    })
                    .collect();
                Some(Group { title: format!("{title}: {app}"), lines })
            })
            .collect()
    }

    pub fn list() -> Result<String, String> {
        let table = plist(&["-convert", "json", "-o", "-", &format!("{KEYBOARD}/no.lproj/DefaultShortcutsTable.xml")], None)
            .or_else(|| plist(&["-convert", "json", "-o", "-", &format!("{KEYBOARD}/en.lproj/DefaultShortcutsTable.xml")], None))
            .ok_or("Trix finner ikke hurtigtastene i denne versjonen av macOS")?;
        let names = plist(&["-extract", "no", "json", "-o", "-", &format!("{KEYBOARD}/DefaultShortcutsTable.loctable")], None)
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        let set = preference("com.apple.symbolichotkeys", "AppleSymbolicHotKeys")
            .and_then(|v| v.as_object().cloned())
            .unwrap_or_default();
        // Desktops 1–16: off unless the user turned them on.
        let spaces: Vec<String> = plist(&["-convert", "json", "-o", "-", &format!("{KEYBOARD}/DefaultSpacesShortcuts.xml")], None)
            .and_then(|v| v.as_array().cloned())
            .unwrap_or_default()
            .iter()
            .filter_map(|node| line(node.as_object()?, false, &names, &set))
            .collect();

        let mut groups = Vec::new();
        for node in table.as_array().into_iter().flatten().filter_map(Value::as_object) {
            let Some(title) = name(node, &names) else { continue };
            if node.get("identifier").and_then(Value::as_str) == Some("applications") {
                groups.extend(app_shortcuts(&names, &title));
                continue;
            }
            let mut lines = Vec::new();
            collect(node, true, &names, &set, &mut lines);
            if node.get("identifier").and_then(Value::as_str) == Some("expose") {
                lines.extend(spaces.iter().cloned());
            }
            groups.push(Group { title, lines });
        }

        let mut text = String::from("# macOS\n");
        for group in groups.iter().filter(|g| !g.lines.is_empty()) {
            text += &format!("\n## {}\n\n{}\n", group.title, group.lines.join("\n"));
        }
        Ok(text)
    }

    #[cfg(test)]
    mod tests {
        use super::*;

        #[test]
        fn system_keys() {
            assert_eq!(keys(51, 20, SHIFT | CMD).as_deref(), Some("shift cmd 3"));
            assert_eq!(keys(65535, 126, CTRL).as_deref(), Some("ctrl opp"));
            assert_eq!(keys(32, 49, CMD).as_deref(), Some("cmd mellomrom"));
            assert_eq!(keys(65535, 103, 0).as_deref(), Some("F11"));
            assert_eq!(keys(65535, 30, CMD), None);
        }

        #[test]
        fn app_shortcut_keys() {
            assert_eq!(menu_keys("@~t").as_deref(), Some("alt cmd T"));
            assert_eq!(menu_keys("^→").as_deref(), Some("ctrl høyre"));
            assert_eq!(menu_keys("@$|").as_deref(), Some("shift cmd \\|"));
            assert_eq!(menu_keys("@\u{f705}").as_deref(), Some("cmd F2"));
            assert_eq!(menu_keys("@").as_deref(), Some("@"));
            assert_eq!(menu_keys("@é"), None);
        }

        /// The list on this Mac reads and holds the screenshot shortcuts by their Norwegian names.
        #[test]
        fn this_mac() {
            let text = list().expect("list");
            assert!(text.contains("## Skjermbilder"), "{text}");
            assert!(text.lines().all(|l| l.is_empty() || l.starts_with('#') || l.starts_with("- ")));
        }
    }
}
