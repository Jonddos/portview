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
///
/// - Windows: verifica si el token actual es de administrador.
/// - Unix: comprueba `getuid() == 0`.
#[tauri::command]
pub async fn check_privileges() -> bool {
    #[cfg(windows)]
    {
        use std::process::Command;
        // Intentar abrir el registro de sistema requiere admin
        Command::new("net")
            .args(["session"])
            .output()
            .map(|o| o.status.success())
            .unwrap_or(false)
    }

    #[cfg(unix)]
    {
        unsafe { libc::getuid() == 0 }
    }

    #[cfg(not(any(windows, unix)))]
    {
        false
    }
}
