use std::process::Command;
use tracing::{debug, warn};

use super::scanner::{ConnectionState, PortEntry, Protocol};

// ─────────────────────────────────────────────
// Detección de WSL
// ─────────────────────────────────────────────

/// Comprueba si WSL está disponible ejecutando `wsl -e echo ok`.
pub fn is_wsl_available() -> bool {
    Command::new("wsl")
        .args(["-e", "echo", "ok"])
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

/// Obtiene el nombre de la distro WSL por defecto.
fn default_distro() -> String {
    Command::new("wsl")
        .args(["-l", "-q"])
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .and_then(|s| {
            s.lines()
                .map(|l| l.trim().trim_matches('\0').to_string())
                .find(|l| !l.is_empty())
        })
        .unwrap_or_else(|| "WSL".to_string())
}

// ─────────────────────────────────────────────
// Escaneo principal
// ─────────────────────────────────────────────

/// Devuelve los sockets activos dentro de WSL.
/// Intenta `ss -tulnp` y hace fallback a `netstat -tlnp` si ss no está.
/// Devuelve Vec vacío si WSL no está disponible o falla.
pub fn scan_wsl_ports() -> Vec<PortEntry> {
    if !is_wsl_available() {
        debug!("WSL no disponible, saltando escaneo WSL");
        return Vec::new();
    }

    let distro = default_distro();
    debug!("Escaneando WSL ({})", distro);

    // Intentar con ss primero, luego con netstat
    let output = Command::new("wsl")
        .args(["-e", "sh", "-c", "ss -tulnp 2>/dev/null || netstat -tlnp 2>/dev/null"])
        .output();

    match output {
        Ok(o) if !o.stdout.is_empty() => {
            let stdout = String::from_utf8_lossy(&o.stdout);
            let source = format!("WSL: {}", distro);
            let entries = parse_socket_output(&stdout, &source);
            debug!("WSL encontró {} entradas", entries.len());
            entries
        }
        Ok(o) => {
            if !o.stderr.is_empty() {
                warn!("WSL stderr: {}", String::from_utf8_lossy(&o.stderr));
            }
            Vec::new()
        }
        Err(e) => {
            warn!("No se pudo ejecutar wsl: {}", e);
            Vec::new()
        }
    }
}

/// Mata un proceso dentro de WSL por su PID de Linux.
pub fn kill_wsl_process(pid: u32) -> Result<(), String> {
    let output = Command::new("wsl")
        .args(["-e", "kill", "-9", &pid.to_string()])
        .output()
        .map_err(|e| format!("No se pudo ejecutar wsl kill: {}", e))?;

    if output.status.success() {
        Ok(())
    } else {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        if err.contains("not permitted") || err.contains("Operation not permitted") {
            Err(format!("Permiso denegado para matar PID {} en WSL", pid))
        } else if err.contains("No such process") {
            Err(format!("El proceso {} ya no existe en WSL", pid))
        } else {
            Err(format!("Error matando PID {} en WSL: {}", pid, err))
        }
    }
}

// ─────────────────────────────────────────────
// Parsers
// ─────────────────────────────────────────────

/// Detecta si la salida es de `ss` o de `netstat` y despacha al parser correcto.
fn parse_socket_output(output: &str, source: &str) -> Vec<PortEntry> {
    let first_line = output.lines().next().unwrap_or("").to_lowercase();
    if first_line.contains("netid") || first_line.contains("state") && first_line.contains("recv") {
        parse_ss(output, source)
    } else {
        parse_netstat(output, source)
    }
}

/// Parser para `ss -tulnp`.
///
/// Formato de línea:
/// ```
/// tcp  LISTEN  0  128  0.0.0.0:8283  0.0.0.0:*  users:(("python3",pid=1234,fd=5))
/// udp  UNCONN  0  0    0.0.0.0:53    0.0.0.0:*  users:(("systemd-r",pid=789,fd=17))
/// ```
fn parse_ss(output: &str, source: &str) -> Vec<PortEntry> {
    let mut entries = Vec::new();

    for line in output.lines().skip(1) {
        let line = line.trim();
        if line.is_empty() { continue; }

        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 5 { continue; }

        let protocol = match cols[0].to_lowercase().as_str() {
            "tcp" => Protocol::Tcp,
            "udp" => Protocol::Udp,
            _ => continue,
        };

        let state = parse_ss_state(cols[1]);

        let Some((local_addr, port)) = parse_addr(cols[4]) else { continue };

        let remote_raw = cols.get(5).copied().unwrap_or("*:*");
        let remote_addr = if matches!(remote_raw, "*:*" | "0.0.0.0:*" | "[::]:*") {
            String::new()
        } else {
            remote_raw.to_string()
        };

        let (process_name, pid) = cols
            .get(6)
            .map(|p| parse_ss_process(p))
            .unwrap_or_default();

        entries.push(PortEntry {
            port,
            protocol,
            state,
            pid,
            process_name,
            exe_path: None,
            user: None,
            local_addr,
            remote_addr,
            source: source.to_string(),
        });
    }

    entries
}

/// Parser para `netstat -tlnp`.
///
/// Formato:
/// ```
/// Proto  Recv-Q  Send-Q  Local Address    Foreign Address  State   PID/Program
/// tcp    0       0       0.0.0.0:8283     0.0.0.0:*        LISTEN  1234/python3
/// ```
fn parse_netstat(output: &str, source: &str) -> Vec<PortEntry> {
    let mut entries = Vec::new();

    for line in output.lines() {
        let line = line.trim();
        let cols: Vec<&str> = line.split_whitespace().collect();
        if cols.len() < 4 { continue; }

        let protocol = match cols[0].to_lowercase().as_str() {
            "tcp" | "tcp6" => Protocol::Tcp,
            "udp" | "udp6" => Protocol::Udp,
            _ => continue,
        };

        let Some((local_addr, port)) = parse_addr(cols[3]) else { continue };

        let foreign = cols.get(4).copied().unwrap_or("*:*");
        let remote_addr = if matches!(foreign, "*:*" | "0.0.0.0:*") {
            String::new()
        } else {
            foreign.to_string()
        };

        let state_str = cols.get(5).copied().unwrap_or("");
        let state = parse_netstat_state(state_str);

        let pid_prog = cols.get(6).copied().unwrap_or("-");
        let (pid, process_name) = parse_netstat_pid(pid_prog);

        entries.push(PortEntry {
            port,
            protocol,
            state,
            pid,
            process_name,
            exe_path: None,
            user: None,
            local_addr,
            remote_addr,
            source: source.to_string(),
        });
    }

    entries
}

// ─────────────────────────────────────────────
// Helpers de parseo
// ─────────────────────────────────────────────

/// Parsea `ip:port` o `[ipv6]:port` → `("ip:port", port_u16)`.
fn parse_addr(addr: &str) -> Option<(String, u16)> {
    if addr.starts_with('[') {
        // IPv6: [::1]:8283
        let close = addr.rfind(']')?;
        let port_str = addr.get(close + 2..)?;
        if port_str == "*" { return None; }
        let port: u16 = port_str.parse().ok()?;
        return Some((addr.to_string(), port));
    }
    // IPv4 o *:port
    let last = addr.rfind(':')?;
    let port_str = &addr[last + 1..];
    if port_str == "*" { return None; }
    let port: u16 = port_str.parse().ok()?;
    Some((addr.to_string(), port))
}

fn parse_ss_state(s: &str) -> ConnectionState {
    match s {
        "LISTEN"                   => ConnectionState::Listen,
        "ESTAB" | "ESTABLISHED"    => ConnectionState::Established,
        "TIME-WAIT"                => ConnectionState::TimeWait,
        "CLOSE-WAIT"               => ConnectionState::CloseWait,
        "SYN-SENT"                 => ConnectionState::SynSent,
        "SYN-RECV"                 => ConnectionState::SynReceived,
        "FIN-WAIT-1"               => ConnectionState::FinWait1,
        "FIN-WAIT-2"               => ConnectionState::FinWait2,
        "LAST-ACK"                 => ConnectionState::LastAck,
        "CLOSING"                  => ConnectionState::Closing,
        _                          => ConnectionState::Unknown,
    }
}

fn parse_netstat_state(s: &str) -> ConnectionState {
    match s {
        "LISTEN"       => ConnectionState::Listen,
        "ESTABLISHED"  => ConnectionState::Established,
        "TIME_WAIT"    => ConnectionState::TimeWait,
        "CLOSE_WAIT"   => ConnectionState::CloseWait,
        "SYN_SENT"     => ConnectionState::SynSent,
        "SYN_RECV"     => ConnectionState::SynReceived,
        "FIN_WAIT1"    => ConnectionState::FinWait1,
        "FIN_WAIT2"    => ConnectionState::FinWait2,
        "LAST_ACK"     => ConnectionState::LastAck,
        "CLOSING"      => ConnectionState::Closing,
        _              => ConnectionState::Unknown,
    }
}

/// `users:(("python3",pid=1234,fd=5))` → `("python3", Some(1234))`
fn parse_ss_process(s: &str) -> (String, Option<u32>) {
    let name = s
        .find("((\"")
        .and_then(|i| {
            let rest = &s[i + 3..];
            rest.find('"').map(|j| rest[..j].to_string())
        })
        .unwrap_or_default();

    let pid = s
        .find("pid=")
        .and_then(|i| {
            let rest = &s[i + 4..];
            let end = rest.find(|c: char| !c.is_ascii_digit()).unwrap_or(rest.len());
            rest[..end].parse().ok()
        });

    (name, pid)
}

/// `1234/python3` → `(Some(1234), "python3")`
fn parse_netstat_pid(s: &str) -> (Option<u32>, String) {
    if s == "-" { return (None, String::new()); }
    if let Some(slash) = s.find('/') {
        let pid = s[..slash].parse().ok();
        let name = s[slash + 1..].to_string();
        return (pid, name);
    }
    (None, s.to_string())
}

// ─────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_ss_listen() {
        let output = "Netid State   Recv-Q Send-Q Local Address:Port Peer Address:Port Process\n\
                      tcp   LISTEN  0      128    0.0.0.0:8283       0.0.0.0:*         users:((\"python3\",pid=1234,fd=5))";
        let entries = parse_ss(output, "WSL: Ubuntu");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].port, 8283);
        assert_eq!(entries[0].process_name, "python3");
        assert_eq!(entries[0].pid, Some(1234));
        assert!(matches!(entries[0].state, ConnectionState::Listen));
        assert_eq!(entries[0].source, "WSL: Ubuntu");
    }

    #[test]
    fn parse_netstat_listen() {
        let output = "Proto Recv-Q Send-Q Local Address Foreign Address State  PID/Program\n\
                      tcp   0      0      0.0.0.0:8283  0.0.0.0:*       LISTEN 5678/node";
        let entries = parse_netstat(output, "WSL");
        assert_eq!(entries.len(), 1);
        assert_eq!(entries[0].port, 8283);
        assert_eq!(entries[0].process_name, "node");
        assert_eq!(entries[0].pid, Some(5678));
    }

    #[test]
    fn parse_addr_ipv4() {
        assert_eq!(parse_addr("0.0.0.0:8080"), Some(("0.0.0.0:8080".to_string(), 8080)));
        assert_eq!(parse_addr("0.0.0.0:*"), None);
        assert_eq!(parse_addr("*:*"), None);
    }

    #[test]
    fn parse_addr_ipv6() {
        let r = parse_addr("[::]:8080");
        assert!(r.is_some());
        assert_eq!(r.unwrap().1, 8080);
    }
}
