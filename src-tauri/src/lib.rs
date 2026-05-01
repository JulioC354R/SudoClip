mod cursor;
mod paste;
mod pinned;
mod toggle;
mod tray;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default()
        .plugin(tauri_plugin_clipboard_manager::init());

    builder = builder
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(tauri_plugin_log::log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::default().build());

    builder = toggle::setup(builder);

    builder = builder
        .invoke_handler(tauri::generate_handler![
            paste::simulate_paste,
            pinned::save_pinned_image,
            pinned::read_pinned_image,
            pinned::delete_pinned_image,
            pinned::clear_pinned_dir,
            cursor::get_cursor_position,
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
