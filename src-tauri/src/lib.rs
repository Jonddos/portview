pub mod core;
pub mod commands;

use commands::{list_ports, kill_port, check_privileges, get_process_detail};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::from_default_env()
                .add_directive("portview=debug".parse().unwrap()),
        )
        .init();

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            list_ports,
            kill_port,
            check_privileges,
            get_process_detail,
        ])
        .run(tauri::generate_context!())
        .expect("Error al iniciar PortView");
}
