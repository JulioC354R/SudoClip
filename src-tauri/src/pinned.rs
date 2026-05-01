use std::fs;
use std::path::Path;
use tauri::AppHandle;
use tauri::Manager;

fn validate_pinned_path(data_dir: &Path, relative_path: &str) -> Result<std::path::PathBuf, String> {
    if relative_path.contains("..") {
        return Err("path traversal denied: '..' not allowed".into());
    }

    let pinned_dir = data_dir.join("pinned");
    let full_path = data_dir.join(relative_path);

    fs::create_dir_all(&pinned_dir).map_err(|e| e.to_string())?;
    let pinned_canonical = pinned_dir.canonicalize().map_err(|e| format!("pinned dir: {e}"))?;

    if full_path.exists() {
        let canonical = full_path.canonicalize().map_err(|e| format!("invalid path: {e}"))?;
        if !canonical.starts_with(&pinned_canonical) {
            return Err("path traversal denied".into());
        }
        return Ok(canonical);
    }

    if let Some(parent) = full_path.parent() {
        if parent.exists() {
            let parent_canonical = parent.canonicalize().map_err(|e| format!("parent: {e}"))?;
            if !parent_canonical.starts_with(&pinned_canonical) {
                return Err("path traversal denied".into());
            }
        }
    }

    Ok(full_path)
}

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
    let full_path = validate_pinned_path(&data_dir, &relative_path)?;
    fs::read(&full_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_pinned_image(
    app: AppHandle,
    relative_path: String,
) -> Result<(), String> {
    let data_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let full_path = validate_pinned_path(&data_dir, &relative_path)?;
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
