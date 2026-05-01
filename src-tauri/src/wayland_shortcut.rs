use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use zbus::zvariant::{OwnedObjectPath, Value};
use futures_util::StreamExt;
use tauri::{AppHandle, Manager};

const PORTAL_DEST: &str = "org.freedesktop.portal.Desktop";
const PORTAL_PATH: &str = "/org/freedesktop/portal/desktop";
const GS_IFACE: &str = "org.freedesktop.portal.GlobalShortcuts";
const GNOME_PATH: &str = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/sudoclip/";

#[derive(Clone)]
#[allow(dead_code)]
pub struct ShortcutState {
    conn: zbus::Connection,
    session_handle: OwnedObjectPath,
    portal_proxy: zbus::Proxy<'static>,
}

pub type SharedShortcut = Arc<Mutex<Option<ShortcutState>>>;

// ── Desktop detection ──

fn detect_desktop() -> String {
    std::env::var("XDG_CURRENT_DESKTOP").unwrap_or_default().to_lowercase()
}

pub fn is_wayland() -> bool {
    std::env::var("WAYLAND_DISPLAY").is_ok()
}

fn is_gnome() -> bool {
    detect_desktop().contains("gnome")
}

fn is_kde() -> bool {
    detect_desktop().contains("kde")
}

// ── GNOME gsettings implementation ──

fn has_gsettings() -> bool {
    std::process::Command::new("which")
        .arg("gsettings")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

fn parse_gvariant_array(raw: &str) -> Vec<String> {
    let s = raw.trim();
    if s.starts_with("@as") || s == "[]" || s.is_empty() {
        return vec![];
    }
    let inner = s.trim_start_matches('[').trim_end_matches(']');
    if inner.is_empty() {
        return vec![];
    }
    inner.split(',').map(|p| p.trim().trim_matches('\'').to_string()).collect()
}

fn format_gvariant_array(paths: &[String]) -> String {
    if paths.is_empty() {
        "@as []".to_string()
    } else {
        let items: Vec<String> = paths.iter().map(|p| format!("'{}'", p)).collect();
        format!("[{}]", items.join(", "))
    }
}

fn run_gsettings(args: &[&str]) -> Result<(), String> {
    let out = std::process::Command::new("gsettings")
        .args(args)
        .output()
        .map_err(|e| format!("gsettings: {e}"))?;
    if !out.status.success() {
        return Err(format!("gsettings failed: {}", String::from_utf8_lossy(&out.stderr)));
    }
    Ok(())
}

fn run_gsettings_with_output(args: &[&str]) -> Result<String, String> {
    let out = std::process::Command::new("gsettings")
        .args(args)
        .output()
        .map_err(|e| format!("gsettings: {e}"))?;
    if !out.status.success() {
        return Err(format!("gsettings failed: {}", String::from_utf8_lossy(&out.stderr)));
    }
    Ok(String::from_utf8_lossy(&out.stdout).trim().to_string())
}

fn is_special_key(s: &str) -> bool {
    matches!(s,
        "Tab" | "Return" | "Escape" | "Space" | "BackSpace" | "Backspace"
        | "Home" | "End" | "PageUp" | "PageDown" | "Insert" | "Delete" | "Del"
        | "Up" | "Down" | "Left" | "Right" | "Menu" | "Pause" | "Print" | "SysReq"
        | "CapsLock" | "NumLock" | "ScrollLock"
        | "F1" | "F2" | "F3" | "F4" | "F5" | "F6" | "F7" | "F8"
        | "F9" | "F10" | "F11" | "F12" | "F13" | "F14" | "F15" | "F16"
        | "F17" | "F18" | "F19" | "F20" | "F21" | "F22" | "F23" | "F24"
    )
}

fn convert_to_gnome(key: &str) -> String {
    let parts: Vec<&str> = key.split('+').collect();
    let mut result = String::new();

    for part in &parts[..parts.len().saturating_sub(1)] {
        match part.to_lowercase().as_str() {
            "win" | "super" | "cmd" => result.push_str("<Super>"),
            "ctrl" | "control" => result.push_str("<Control>"),
            "alt" => result.push_str("<Alt>"),
            "shift" => result.push_str("<Shift>"),
            _ => {}
        }
    }

    if let Some(k) = parts.last() {
        if is_special_key(k) {
            result.push_str(k);
        } else {
            result.push_str(&k.to_lowercase());
        }
    }

    result
}

fn gnome_register(command: &str, shortcut: &str) -> Result<(), String> {
    let schema = format!("org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH}");

    for (key, value) in [("name", "SudoClip"), ("command", command), ("binding", shortcut)] {
        run_gsettings(&["set", &schema, key, value])?;
    }

    let raw = run_gsettings_with_output(&[
        "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings",
    ])?;

    let mut paths = parse_gvariant_array(&raw);
    let path_str = GNOME_PATH.to_string();
    if !paths.contains(&path_str) {
        paths.push(path_str);
    }

    let new_val = format_gvariant_array(&paths);
    run_gsettings(&["set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", &new_val])?;

    Ok(())
}

fn gnome_update(shortcut: &str) -> Result<(), String> {
    let schema = format!("org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH}");

    let raw = run_gsettings_with_output(&[
        "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings",
    ])?;
    let mut paths = parse_gvariant_array(&raw);
    let path_str = GNOME_PATH.to_string();
    if !paths.contains(&path_str) {
        paths.push(path_str);
        let new_val = format_gvariant_array(&paths);
        run_gsettings(&["set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", &new_val])?;
    }

    run_gsettings(&["set", &schema, "binding", shortcut])?;
    Ok(())
}

#[allow(dead_code)]
fn gnome_unregister() -> Result<(), String> {
    let raw = run_gsettings_with_output(&[
        "get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings",
    ])?;

    let mut paths = parse_gvariant_array(&raw);
    paths.retain(|p| p != GNOME_PATH);
    let new_val = format_gvariant_array(&paths);
    run_gsettings(&["set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", &new_val])?;

    Ok(())
}

// ── KDE / Portal implementation ──

async fn portal_init(app: &AppHandle, shortcut_key: &str) -> Result<(), String> {
    let conn = zbus::Connection::session().await.map_err(|e| format!("zbus: {e}"))?;
    let unique = conn.unique_name().ok_or("no unique bus name")?.as_str().to_owned();

    let gs = zbus::Proxy::new(&conn, PORTAL_DEST, PORTAL_PATH, GS_IFACE)
        .await
        .map_err(|e| format!("gs proxy: {e}"))?;

    let session_token = format!("st{}", nanos());
    let handle_token = format!("ct{}", nanos());

    let mut opts: HashMap<&str, Value<'_>> = HashMap::new();
    opts.insert("session_handle_token", Value::Str(session_token.clone().into()));
    opts.insert("handle_token", Value::Str(handle_token.into()));
    gs.call_method("CreateSession", &opts).await.map_err(|e| format!("CreateSession: {e}"))?;

    let uid = unique.trim_start_matches(':').replace('.', "_");
    let session_handle = OwnedObjectPath::try_from(format!("{PORTAL_PATH}/session/{uid}/{session_token}"))
        .map_err(|e| format!("session path: {e}"))?;

    log::info!("Wayland portal session created: {session_handle}");

    let trigger = convert_to_gnome(shortcut_key);
    portal_bind_shortcuts(&gs, &session_handle, &trigger).await?;
    log::info!("Shortcut bound: {trigger}");

    let session_gs = zbus::Proxy::new(&conn, PORTAL_DEST, session_handle.as_ref(), GS_IFACE)
        .await
        .map_err(|e| format!("session gs: {e}"))?;

    let mut activated = session_gs
        .receive_signal("Activated")
        .await
        .map_err(|e| format!("receive Activated: {e}"))?;

    let app_clone = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(msg) = activated.next().await {
            if let Ok((_sh, id, _ts, _opts)) =
                msg.body().deserialize::<(OwnedObjectPath, String, u64, HashMap<String, Value>)>()
            {
                if id == "toggle" {
                    crate::toggle::handle_toggle(&app_clone);
                }
            }
        }
        log::warn!("Wayland Activated stream ended");
        std::future::pending::<()>().await;
    });

    let state: SharedShortcut = app.state::<SharedShortcut>().inner().clone();
    *state.lock().unwrap() = Some(ShortcutState {
        conn,
        session_handle,
        portal_proxy: gs,
    });

    Ok(())
}

async fn portal_bind_shortcuts(gs: &zbus::Proxy<'_>, session_handle: &OwnedObjectPath, trigger: &str) -> Result<(), String> {
    let props: HashMap<&str, Value<'_>> = HashMap::from([
        ("preferred-trigger", Value::Str(trigger.into())),
        ("description", Value::Str("Toggle SudoClip window".into())),
    ]);
    let shortcuts: Vec<(&str, HashMap<&str, Value<'_>>)> = vec![("toggle", props)];

    let mut opts: HashMap<&str, Value<'_>> = HashMap::new();
    opts.insert("handle_token", Value::Str(format!("bt{}", nanos()).into()));

    gs.call_method("BindShortcuts", &(session_handle.as_ref(), shortcuts, "", opts))
        .await
        .map_err(|e| format!("BindShortcuts: {e}"))?;

    Ok(())
}

async fn portal_rebind(state: &ShortcutState, key: &str) -> Result<(), String> {
    let trigger = convert_to_gnome(key);
    portal_bind_shortcuts(&state.portal_proxy, &state.session_handle, &trigger).await
}

fn nanos() -> u128 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_nanos()
}

// ── Public API ──

pub async fn init(app: &AppHandle, shortcut_key: &str) -> Result<(), String> {
    if is_gnome() {
        if !has_gsettings() {
            return Err("gsettings not found".into());
        }

        let exe = std::env::current_exe().map_err(|e| format!("current_exe: {e}"))?;
        let command = format!("{} toggle", exe.display());
        let gnome_key = convert_to_gnome(shortcut_key);

        gnome_register(&command, &gnome_key)?;
        log::info!("GNOME shortcut registered via gsettings: {gnome_key} -> {command}");
        Ok(())
    } else if is_kde() {
        portal_init(app, shortcut_key).await
    } else {
        if is_wayland() {
            log::warn!("Unknown desktop ({}), trying portal...", detect_desktop());
            if let Err(e) = portal_init(app, shortcut_key).await {
                log::warn!("Portal init failed: {e}");
                Err(format!("Portal failed on unknown desktop: {e}"))
            } else {
                Ok(())
            }
        } else {
            // X11: handled by tauri-plugin-global-shortcut
            Ok(())
        }
    }
}

#[tauri::command]
pub async fn init_wayland_shortcut(app: AppHandle, key: String) -> Result<(), String> {
    init(&app, &key).await
}

#[tauri::command]
pub async fn update_wayland_shortcut(app: AppHandle, key: String) -> Result<(), String> {
    if is_gnome() {
        if !has_gsettings() {
            return Ok(()); // silently ignore
        }
        let gnome_key = convert_to_gnome(&key);
        gnome_update(&gnome_key)
    } else if is_kde() {
        let state: SharedShortcut = app.state::<SharedShortcut>().inner().clone();
        let maybe = state.lock().unwrap().clone();
        match maybe {
            Some(s) => portal_rebind(&s, &key).await,
            None => Ok(()),
        }
    } else {
        Ok(())
    }
}

#[allow(dead_code)]
pub fn cleanup_gnome() {
    if is_gnome() && has_gsettings() {
        let _ = gnome_unregister();
    }
}
