mod cursor;
mod paste;
mod pinned;
mod toggle;
mod tray;
mod wayland_shortcut;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init());

    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(if cfg!(debug_assertions) {
                    tauri_plugin_log::log::LevelFilter::Debug
                } else {
                    tauri_plugin_log::log::LevelFilter::Warn
                })
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build());

    builder = toggle::setup(builder);

    builder = builder
        .manage(wayland_shortcut::SharedShortcut::default())
        .invoke_handler(tauri::generate_handler![
            paste::simulate_paste,
            pinned::save_pinned_image,
            pinned::read_pinned_image,
            pinned::delete_pinned_image,
            pinned::clear_pinned_dir,
            cursor::get_cursor_position,
            wayland_shortcut::init_wayland_shortcut,
            wayland_shortcut::update_wayland_shortcut,
        ])
        .setup(|app| {
            if toggle::should_toggle() {
                toggle::handle_toggle(&app.handle());
            }
            let _ = tray::create_tray(&app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = window.hide();
            }
        });

    builder
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
