mod models;
mod projects;

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            models::load_model_registry,
            models::save_model_registry,
            models::discover_model_sources,
            models::fetch_model_catalog,
            projects::pick_directory,
            projects::clone_repository
        ])
        .run(tauri::generate_context!())
        .expect("failed to run Mesh desktop application");
}
