import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PortEntry, PortFilters, PrivilegeLevel } from "../types/port";

interface UsePortsOptions {
  /** Intervalo de auto-refresco en ms. 0 = desactivado. */
  refreshInterval?: number;
}

interface UsePortsReturn {
  entries: PortEntry[];
  filteredEntries: PortEntry[];
  loading: boolean;
  error: string | null;
  lastRefresh: Date | null;
  privilegeLevel: PrivilegeLevel;
  filters: PortFilters;
  setFilters: (f: Partial<PortFilters>) => void;
  refresh: () => Promise<void>;
  killProcess: (pid: number, processName: string) => Promise<void>;
}

const DEFAULT_FILTERS: PortFilters = {
  search: "",
  protocol: "ALL",
  state: "ALL",
  onlyListening: false,
};

export function usePorts(options: UsePortsOptions = {}): UsePortsReturn {
  const { refreshInterval = 0 } = options;

  const [entries, setEntries] = useState<PortEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [privilegeLevel, setPrivilegeLevel] = useState<PrivilegeLevel>("partial");
  const [filters, setFiltersState] = useState<PortFilters>(DEFAULT_FILTERS);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cargar puertos ──────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [ports, isAdmin] = await Promise.all([
        invoke<PortEntry[]>("list_ports"),
        invoke<boolean>("check_privileges"),
      ]);
      setEntries(ports);
      setPrivilegeLevel(isAdmin ? "full" : "partial");
      setLastRefresh(new Date());
    } catch (err) {
      setError(typeof err === "string" ? err : "Error desconocido al escanear puertos");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Auto-refresco ───────────────────────────────────────────────────
  useEffect(() => {
    // Carga inicial
    refresh();

    if (refreshInterval > 0) {
      intervalRef.current = setInterval(refresh, refreshInterval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [refresh, refreshInterval]);

  // ── Matar proceso ───────────────────────────────────────────────────
  const killProcess = useCallback(async (pid: number, processName: string) => {
    await invoke("kill_port", { pid });
    // Refrescar inmediatamente para reflejar el cambio
    await refresh();
  }, [refresh]);

  // ── Filtros ─────────────────────────────────────────────────────────
  const setFilters = useCallback((partial: Partial<PortFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...partial }));
  }, []);

  const filteredEntries = applyFilters(entries, filters);

  return {
    entries,
    filteredEntries,
    loading,
    error,
    lastRefresh,
    privilegeLevel,
    filters,
    setFilters,
    refresh,
    killProcess,
  };
}

// ── Lógica de filtrado (pura, testeable) ────────────────────────────

function applyFilters(entries: PortEntry[], filters: PortFilters): PortEntry[] {
  const search = filters.search.toLowerCase().trim();

  return entries.filter((e) => {
    if (filters.protocol !== "ALL" && e.protocol !== filters.protocol) return false;
    if (filters.state !== "ALL" && e.state !== filters.state) return false;
    if (filters.onlyListening && e.state !== "Listen") return false;
    if (search) {
      const haystack = [
        e.port.toString(),
        e.process_name,
        e.local_addr,
        e.remote_addr,
        e.pid?.toString() ?? "",
        e.user ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}
