#[cfg(not(target_os = "linux"))]
use netstat2::{get_sockets_info, AddressFamilyFlags, ProtocolFlags, SocketInfo};
use serde::{Deserialize, Serialize};
use sysinfo::{ProcessRefreshKind, RefreshKind, System};
use tracing::{debug, warn};

// ─────────────────────────────────────────────
// Tipos públicos
// ─────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "UPPERCASE")]
pub enum Protocol {
    Tcp,
    Udp,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "PascalCase")]
pub enum ConnectionState {
    Listen,
    Established,
    TimeWait,
    CloseWait,
    SynSent,
    SynReceived,
    FinWait1,
    FinWait2,
    LastAck,
    Closing,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PortEntry {
    pub port: u16,
    pub protocol: Protocol,
    pub state: ConnectionState,
    pub pid: Option<u32>,
    pub process_name: String,
    pub exe_path: Option<String>,
    pub user: Option<String>,
    pub local_addr: String,
    pub remote_addr: String,
    /// "Windows" | "macOS" | "Linux" | "WSL: Ubuntu" …
    pub source: String,
}

// ─────────────────────────────────────────────
// Errores
// ─────────────────────────────────────────────

#[derive(Debug, thiserror::Error, Serialize)]
pub enum ScanError {
    #[error("Acceso denegado — se requieren privilegios de administrador/root")]
    PermissionDenied,
    #[error("Error al escanear sockets: {0}")]
    ScanFailed(String),
}

// ─────────────────────────────────────────────
// Función principal
// ─────────────────────────────────────────────

pub fn scan_ports() -> Result<Vec<PortEntry>, ScanError> {
    debug!("Iniciando escaneo de puertos...");

    #[cfg(not(target_os = "linux"))]
    let mut entries = scan_with_netstat2()?;

    #[cfg(target_os = "linux")]
    let mut entries: Vec<PortEntry> = crate::core::wsl::scan_native_ss_ports();

    let platform = if cfg!(windows) {
        "Windows"
    } else if cfg!(target_os = "macos") {
        "macOS"
    } else {
        "Linux"
    };
    debug!("{}: {} entradas", platform, entries.len());

    // WSL solo aplica en Windows
    #[cfg(windows)]
    {
        let wsl_entries = crate::core::wsl::scan_wsl_ports();
        debug!("WSL: {} entradas", wsl_entries.len());
        entries.extend(wsl_entries);
    }

    debug!("Total: {} entradas", entries.len());
    Ok(entries)
}

// ─────────────────────────────────────────────
// Backend netstat2 (Windows + macOS)
// ─────────────────────────────────────────────

#[cfg(not(target_os = "linux"))]
fn scan_with_netstat2() -> Result<Vec<PortEntry>, ScanError> {
    let source = if cfg!(windows) { "Windows" } else { "macOS" };

    let af_flags    = AddressFamilyFlags::IPV4 | AddressFamilyFlags::IPV6;
    let proto_flags = ProtocolFlags::TCP | ProtocolFlags::UDP;

    let sockets = get_sockets_info(af_flags, proto_flags).map_err(|e| {
        let msg = e.to_string();
        if msg.to_lowercase().contains("access") || msg.to_lowercase().contains("permission") {
            ScanError::PermissionDenied
        } else {
            ScanError::ScanFailed(msg)
        }
    })?;

    let mut sys = System::new_with_specifics(
        RefreshKind::new().with_processes(ProcessRefreshKind::everything()),
    );
    sys.refresh_all();

    Ok(sockets
        .into_iter()
        .filter_map(|s| socket_to_entry(&s, &sys, source))
        .collect())
}

#[cfg(not(target_os = "linux"))]
fn socket_to_entry(socket: &SocketInfo, sys: &System, source: &str) -> Option<PortEntry> {
    use netstat2::ProtocolSocketInfo;

    let pid = socket.associated_pids.first().copied();
    let (process_name, exe_path, user) = process_info(pid, sys);

    match &socket.protocol_socket_info {
        ProtocolSocketInfo::Tcp(tcp) => Some(PortEntry {
            port: tcp.local_port,
            protocol: Protocol::Tcp,
            state: map_tcp_state(&tcp.state),
            pid,
            process_name,
            exe_path,
            user,
            local_addr: format!("{}:{}", tcp.local_addr, tcp.local_port),
            remote_addr: format!("{}:{}", tcp.remote_addr, tcp.remote_port),
            source: source.to_string(),
        }),
        ProtocolSocketInfo::Udp(udp) => Some(PortEntry {
            port: udp.local_port,
            protocol: Protocol::Udp,
            state: ConnectionState::Unknown,
            pid,
            process_name,
            exe_path,
            user,
            local_addr: format!("{}:{}", udp.local_addr, udp.local_port),
            remote_addr: String::new(),
            source: source.to_string(),
        }),
    }
}

// ─────────────────────────────────────────────
// Helpers comunes
// ─────────────────────────────────────────────

pub fn process_info(pid: Option<u32>, sys: &System) -> (String, Option<String>, Option<String>) {
    let Some(pid) = pid else {
        return (String::new(), None, None);
    };

    let spid = sysinfo::Pid::from_u32(pid);
    let Some(proc) = sys.process(spid) else {
        warn!("PID {} no encontrado en sysinfo", pid);
        return (String::new(), None, None);
    };

    let name  = proc.name().to_string();
    let path  = proc.exe().map(|p| p.to_string_lossy().to_string());
    let user  = proc.user_id().map(|u| u.to_string());

    (name, path, user)
}

#[cfg(not(target_os = "linux"))]
fn map_tcp_state(state: &netstat2::TcpState) -> ConnectionState {
    use netstat2::TcpState::*;
    match state {
        Listen      => ConnectionState::Listen,
        Established => ConnectionState::Established,
        TimeWait    => ConnectionState::TimeWait,
        CloseWait   => ConnectionState::CloseWait,
        SynSent     => ConnectionState::SynSent,
        SynReceived => ConnectionState::SynReceived,
        FinWait1    => ConnectionState::FinWait1,
        FinWait2    => ConnectionState::FinWait2,
        LastAck     => ConnectionState::LastAck,
        Closing     => ConnectionState::Closing,
        _           => ConnectionState::Unknown,
    }
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn scan_returns_entries() {
        match scan_ports() {
            Ok(entries) => {
                println!("Encontrados {} puertos", entries.len());
                for e in &entries {
                    assert!(e.port > 0);
                }
            }
            Err(ScanError::PermissionDenied) => {
                println!("Test omitido: se requieren privilegios");
            }
            Err(e) => panic!("Error inesperado: {}", e),
        }
    }

    #[test]
    fn port_entry_serializes_to_json() {
        let entry = PortEntry {
            port: 8080,
            protocol: Protocol::Tcp,
            state: ConnectionState::Listen,
            pid: Some(1234),
            process_name: "node".into(),
            exe_path: Some("/usr/bin/node".into()),
            user: Some("alice".into()),
            local_addr: "0.0.0.0:8080".into(),
            remote_addr: String::new(),
            source: "Linux".into(),
        };
        let json = serde_json::to_string(&entry).expect("Debe serializar");
        assert!(json.contains("8080"));
        assert!(json.contains("TCP"));
        assert!(json.contains("Listen"));
    }
}
