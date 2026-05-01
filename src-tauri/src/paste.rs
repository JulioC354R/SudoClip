#[tauri::command]
pub fn simulate_paste() {
    paste_impl();
}

#[cfg(target_os = "linux")]
fn paste_impl() {
    use std::process::Command;

    let _ = Command::new("ydotool")
        .args(["key", "29:1", "47:1", "47:0", "29:0"])
        .status();
}
#[cfg(not(target_os = "linux"))]
fn paste_impl() {
    use enigo::{Enigo, Key, KeyboardControllable};
    let mut enigo = Enigo::new();
    enigo.key_down(Key::Control);
    enigo.key_click(Key::Layout('v'));
    enigo.key_up(Key::Control);
}
