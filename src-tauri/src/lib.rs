mod deps;

use deps::DependencyReport;

#[tauri::command]
fn check_dependencies() -> DependencyReport {
    deps::check_dependencies()
}

#[tauri::command]
fn app_info() -> serde_json::Value {
    serde_json::json!({
        "name": "BookOCR",
        "brand": "l'Atelier",
        "version": env!("CARGO_PKG_VERSION"),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![check_dependencies, app_info])
        .run(tauri::generate_context!())
        .expect("error while running BookOCR");
}
