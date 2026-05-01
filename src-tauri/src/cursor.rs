use tauri;

#[tauri::command]
pub async fn get_cursor_position() -> Result<(i32, i32), String> {
    #[cfg(target_os = "linux")]
    {
        linux_cursor_position()
    }
    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        let enigo = enigo::Enigo::new();
        Ok(enigo.mouse_location())
    }
    #[cfg(not(any(target_os = "linux", target_os = "windows", target_os = "macos")))]
    {
        Err("cursor position not supported on this platform".into())
    }
}

#[cfg(target_os = "linux")]
fn linux_cursor_position() -> Result<(i32, i32), String> {
    let output = std::process::Command::new("xdotool")
        .args(["getmouselocation", "--shell"])
        .output()
        .map_err(|e| format!("xdotool not available: {}", e))?;
    if !output.status.success() {
        return Err("xdotool returned non-zero exit status".into());
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut x = 0i32;
    let mut y = 0i32;
    for line in stdout.lines() {
        if let Some(val) = line.strip_prefix("X=") {
            x = val.trim().parse().map_err(|_| "failed to parse X coordinate")?;
        } else if let Some(val) = line.strip_prefix("Y=") {
            y = val.trim().parse().map_err(|_| "failed to parse Y coordinate")?;
        }
    }
    Ok((x, y))
}
