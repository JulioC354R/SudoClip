use std::fs;
use tauri::AppHandle;
use tauri::Manager;

#[tauri::command]
pub async fn save_pinned_image(
    app: AppHandle,
    id: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pinned_dir = data_dir.join("pinned");
    fs::create_dir_all(&pinned_dir).map_err(|e| e.to_string())?;
    let file_path = pinned_dir.join(format!("{}.png", id));
    fs::write(&file_path, &bytes).map_err(|e| e.to_string())?;
    Ok(format!("pinned/{}.png", id))
}

#[tauri::command]
pub async fn read_pinned_image(
    app: AppHandle,
    relative_path: String,
) -> Result<Vec<u8>, String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let full_path = data_dir.join(&relative_path);
    fs::read(&full_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_pinned_image(
    app: AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let full_path = data_dir.join(&relative_path);
    if full_path.exists() {
        fs::remove_file(&full_path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub async fn clear_pinned_dir(app: AppHandle) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let pinned_dir = data_dir.join("pinned");
    if pinned_dir.exists() {
        fs::remove_dir_all(&pinned_dir).map_err(|e| e.to_string())?;
    }
    fs::create_dir_all(&pinned_dir).map_err(|e| e.to_string())?;
    Ok(())
}
