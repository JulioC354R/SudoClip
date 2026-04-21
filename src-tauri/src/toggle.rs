use tauri::{AppHandle, Manager};

pub fn handle_toggle(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let is_visible = window.is_visible().unwrap_or(false);

        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

pub fn should_toggle() -> bool {
    std::env::args().any(|arg| arg == "toggle")
}

pub fn setup(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.plugin(tauri_plugin_single_instance::init(|app, argv, _cwd| {
        if argv.contains(&"toggle".to_string()) {
            handle_toggle(&app);
        }
    }))
}
