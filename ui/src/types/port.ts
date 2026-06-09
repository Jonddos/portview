// Tipos que deben coincidir exactamente con los structs Rust en scanner.rs / process.rs

export type Protocol = "TCP" | "UDP";

export type ConnectionState =
  | "Listen"
  | "Established"
  | "TimeWait"
  | "CloseWait"
  | "SynSent"
  | "SynReceived"
  | "FinWait1"
  | "FinWait2"
  | "LastAck"
  | "Closing"
  | "Unknown";

export interface PortEntry {
  port: number;
  protocol: Protocol;
  state: ConnectionState;
  pid: number | null;
  process_name: string;
  exe_path: string | null;
  user: string | null;
  local_addr: string;
  remote_addr: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  exe_path: string | null;
  user: string | null;
  memory_bytes: number;
  cpu_usage: number;
  start_time: number;
}

// Estado de privilegios de la app
export type PrivilegeLevel = "full" | "partial";

// Resultado del escaneo
export interface ScanResult {
  entries: PortEntry[];
  scanned_at: Date;
  privilege_level: PrivilegeLevel;
}

// Filtros de la tabla
export interface PortFilters {
  search: string;         // filtra port, process_name, local_addr
  protocol: Protocol | "ALL";
  state: ConnectionState | "ALL";
  onlyListening: boolean;
}
