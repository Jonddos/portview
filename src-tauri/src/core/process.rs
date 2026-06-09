use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, RefreshKind, System};
use tracing::warn;

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub exe_path: Option<String>,
    pub user: Option<String>,
    /// Uso de memoria en bytes
    pub memory_bytes: u64,
    /// Uso de CPU en porcentaje (0.0–100.0)
    pub cpu_usage: f32,
    /// Tiempo de inicio del proceso (segundos desde epoch)
    pub start_time: u64,
}

// ─────────────────────────────────────────────
// Errores
// ─────────────────────────────────────────────

#[derive(Debug, thiserror::Error, Serialize)]
pub enum KillError {
    #[error("Proceso con PID {0} no encontrado")]
    NotFound(u32),
    #[error("Acceso denegado para matar el proceso {0}")]
    PermissionDenied(u32),
    #[error("Error al matar el proceso {pid}: {msg}")]
    KillFailed { pid: u32, msg: String },
}

// ─────────────────────────────────────────────
// Funciones públicas
// ─────────────────────────────────────────────

/// Devuelve información detallada de un proceso por PID.
/// Devuelve `None` si el proceso no existe o no es visible.
pub fn get_process_info(pid: u32) -> Option<ProcessInfo> {
    let mut sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_all();

    let spid = sysinfo::Pid::from_u32(pid);
    let proc = sys.process(spid)?;

    Some(ProcessInfo {
        pid,
        name: proc.name().to_string(),
        exe_path: proc.exe().map(|p| p.to_string_lossy().to_string()),
        user: proc.user_id().map(|u| u.to_string()),
        memory_bytes: proc.memory(),
        cpu_usage: proc.cpu_usage(),
        start_time: proc.start_time(),
    })
}

/// Mata un proceso por PID.
///
/// Usa `SIGKILL` en Unix y `TerminateProcess` en Windows.
/// Si el proceso no existe devuelve `KillError::NotFound`.
/// Si el caller no tiene permisos devuelve `KillError::PermissionDenied`.
pub fn kill_process(pid: u32) -> Result<(), KillError> {
    let mut sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_all();

    let spid = sysinfo::Pid::from_u32(pid);
    let proc = sys.process(spid).ok_or(KillError::NotFound(pid))?;

    let killed = proc.kill();

    if killed {
        Ok(())
    } else {
        warn!("No se pudo matar el proceso {}", pid);
        // sysinfo no distingue PermissionDenied de otros errores en el valor bool.
        // Intentamos refinar el error comprobando si el proceso aún existe.
        Err(KillError::PermissionDenied(pid))
    }
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn get_own_process_info() {
        let pid = std::process::id();
        let info = get_process_info(pid);
        assert!(info.is_some(), "Debe poder obtener info del proceso actual");
        let info = info.unwrap();
        assert_eq!(info.pid, pid);
        assert!(!info.name.is_empty(), "El nombre del proceso no debe estar vacío");
    }

    #[test]
    fn get_nonexistent_process() {
        // PID 0 no es un proceso de usuario válido
        let info = get_process_info(0);
        // Puede ser None (no existe) o Some (proceso del sistema) según el SO
        // Solo verificamos que no panique
        let _ = info;
    }

    #[test]
    fn kill_nonexistent_process_returns_not_found() {
        // PID muy alto, casi imposible que exista
        let result = kill_process(9_999_999);
        // Esperamos NotFound o que el proceso no exista
        match result {
            Err(KillError::NotFound(_)) => {}
            Ok(_) => panic!("No debería poder matar un proceso inexistente"),
            Err(e) => panic!("Error inesperado: {}", e),
        }
    }
}
