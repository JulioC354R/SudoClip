// Teste simples: registra Control+1 para rodar kitty via gsettings
// Uso: cargo run --bin test_portal

use std::process::Command;

const GNOME_PATH: &str = "/org/gnome/settings-daemon/plugins/media-keys/custom-keybindings/sudoclip_test/";

fn main() {
    println!("=== Teste GNOME gsettings: Control+1 -> kitty ===\n");

    if Command::new("which").arg("gsettings").output().map(|o| o.status.success()).unwrap_or(false) {
        println!("✓ gsettings disponivel");
    } else {
        println!("✗ gsettings nao encontrado");
        return;
    }

    // 1. Registra nome, comando e atalho no path personalizado
    let schema = format!("org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH}");

    println!("1. Registrando 'kitty' em Control+1...");
    for (key, val) in [("name", "'Teste SudoClip'"), ("command", "'kitty'"), ("binding", "'<Control>1'")] {
        let out = Command::new("gsettings")
            .args(["set", &schema, key, val])
            .output()
            .unwrap();
        if out.status.success() {
            println!("   ✓ {key} = {val}");
        } else {
            println!("   ✗ {key}: {}", String::from_utf8_lossy(&out.stderr));
        }
    }

    // 2. Verifica
    println!("\n2. Verificando valores:");
    for key in &["name", "command", "binding"] {
        let out = Command::new("gsettings")
            .args(["get", &schema, key])
            .output()
            .unwrap();
        println!("   {key} = {}", String::from_utf8_lossy(&out.stdout).trim());
    }

    // 3. Adiciona ao array custom-keybindings (se ja nao estiver)
    println!("\n3. Adicionando ao array custom-keybindings...");
    let out = Command::new("gsettings")
        .args(["get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"])
        .output()
        .unwrap();
    let current = String::from_utf8_lossy(&out.stdout).trim().to_string();
    println!("   Array atual: {current}");

    if !current.contains(GNOME_PATH) {
        // Adiciona nosso path ao array
    let new_val = if current.starts_with("@as") || current == "[]" {
        format!("['{}']", GNOME_PATH)
    } else {
        let trimmed = current.trim_start_matches('[').trim_end_matches(']');
        let prefix = if trimmed.is_empty() { String::new() } else { format!("{}, ", trimmed) };
        format!("[{}'{}']", prefix, GNOME_PATH)
    };

        let out = Command::new("gsettings")
            .args(["set", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings", &new_val])
            .output()
            .unwrap();
        if out.status.success() {
            println!("   ✓ Array atualizado");
        } else {
            println!("   ✗ Erro: {}", String::from_utf8_lossy(&out.stderr));
        }
    } else {
        println!("   ✓ Ja esta no array");
    }

    // 4. Verificacao final
    println!("\n4. Verificacao final:");
    let out = Command::new("gsettings")
        .args(["get", "org.gnome.settings-daemon.plugins.media-keys", "custom-keybindings"])
        .output()
        .unwrap();
    println!("   Array: {}", String::from_utf8_lossy(&out.stdout).trim());

    println!("\n=== PRONTO ===");
    println!("Abra GNOME Settings → Keyboard → Custom Shortcuts");
    println!("Procure por 'Teste SudoClip' com atalho Control+1");
    println!("Pressione Control+1 para abrir o Kitty");
    println!("\nPara remover depois:");
    println!("  gsettings reset org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH} name");
    println!("  gsettings reset org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH} command");
    println!("  gsettings reset org.gnome.settings-daemon.plugins.media-keys.custom-keybinding:{GNOME_PATH} binding");
    println!("  # E remover do array: gsettings get ... e set sem nosso path");
}
