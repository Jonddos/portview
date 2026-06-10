use crate::core::{
    kill_process, scan_ports, get_process_info,
    PortEntry, ProcessInfo,
};
use tracing::{error, info};

/// Lista todos los puertos activos del sistema.
/// Serializado automáticamente por Tauri para el frontend.
#[tauri::command]
pub async fn list_ports() -> Result<Vec<PortEntry>, String> {
    info!("Comando list_ports invocado");
    scan_ports().map_err(|e| {
        error!("Error en scan_ports: {}", e);
        e.to_string()
    })
}

/// Mata el proceso con el PID indicado.
///
/// # Argumentos
/// - `pid`: PID del proceso a terminar.
#[tauri::command]
pub async fn kill_port(pid: u32) -> Result<(), String> {
    info!("Comando kill_port invocado para PID {}", pid);
    kill_process(pid).map_err(|e| {
        error!("Error al matar PID {}: {}", pid, e);
        e.to_string()
    })
}

/// Devuelve información detallada de un proceso por PID.
/// Útil para mostrar detalles antes de confirmar un kill.
#[tauri::command]
pub async fn get_process_detail(pid: u32) -> Option<ProcessInfo> {
    info!("Comando get_process_detail para PID {}", pid);
    get_process_info(pid)
}

/// Comprueba si la app está corriendo con privilegios elevados.
#[tauri::command]
pub async fn check_privileges() -> bool {
    crate::privileges::is_elevated()
}

/// Relanza la app como administrador/root y cierra la instancia actual.
/// Dispara el diálogo UAC en Windows.
#[tauri::command]
pub async fn relaunch_as_admin() -> Result<(), String> {
    crate::privileges::relaunch_as_admin()
}

/// Mata un proceso dentro de WSL usando su PID de Linux.
#[tauri::command]
pub async fn kill_wsl_process(pid: u32) -> Result<(), String> {
    tracing::info!("kill_wsl_process PID={}", pid);
    crate::core::wsl::kill_wsl_process(pid)
}

/// Indica si WSL está disponible en el sistema.
#[tauri::command]
pub async fn wsl_available() -> bool {
    crate::core::wsl::is_wsl_available()
}
