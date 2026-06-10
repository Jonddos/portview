import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { PortEntry, ProcessInfo } from "../types/port";

interface ProcessDetailProps {
  entry: PortEntry;
  onClose: () => void;
  onKill: (pid: number, processName: string, source: string) => void;
}

// ── Helpers de formato ──────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function fmtUptime(startEpochSecs: number): string {
  const elapsed = Math.max(0, Math.floor(Date.now() / 1000) - startEpochSecs);
  const d = Math.floor(elapsed / 86400);
  const h = Math.floor((elapsed % 86400) / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function fmtStartTime(startEpochSecs: number): string {
  return new Date(startEpochSecs * 1000).toLocaleString();
}

// ── Barra de progreso mini ──────────────────────────────────────────

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Fila de detalle ─────────────────────────────────────────────────

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-2.5 border-b border-gray-100 last:border-0">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <div className="text-sm text-gray-800 font-medium">{children}</div>
    </div>
  );
}

// ── Componente principal ────────────────────────────────────────────

export function ProcessDetail({ entry, onClose, onKill }: ProcessDetailProps) {
  const [info,    setInfo]    = useState<ProcessInfo | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry.pid == null) { setInfo(null); return; }

    setLoading(true);
    setInfo(null);

    invoke<ProcessInfo | null>("get_process_detail", { pid: entry.pid })
      .then(setInfo)
      .catch(() => setInfo(null))
      .finally(() => setLoading(false));
  }, [entry.pid]);

  // Avatar color determinista
  const letter = entry.process_name ? entry.process_name[0].toUpperCase() : "?";

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50 shrink-0">
        <span className="text-sm font-semibold text-gray-800">Detalle</span>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors text-base leading-none"
        >
          ✕
        </button>
      </div>

      {/* ── Hero del proceso ── */}
      <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-br from-indigo-50 to-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0">
            {letter}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-900 truncate">{entry.process_name || "Proceso desconocido"}</p>
            <p className="text-xs text-indigo-500 font-mono">PID {entry.pid ?? "—"}</p>
          </div>
        </div>
      </div>

      {/* ── Métricas en vivo ── */}
      {loading && (
        <div className="flex items-center justify-center py-4 gap-2 text-gray-400 text-xs shrink-0">
          <div className="w-3 h-3 border border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
          Cargando métricas...
        </div>
      )}

      {info && !loading && (
        <div className="px-4 py-3 border-b border-gray-100 shrink-0 space-y-3">
          {/* CPU */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">CPU</span>
              <span className="text-xs font-semibold text-indigo-600">{info.cpu_usage.toFixed(1)}%</span>
            </div>
            <MiniBar value={info.cpu_usage} max={100} color="bg-indigo-400" />
          </div>
          {/* Memoria */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">Memoria</span>
              <span className="text-xs font-semibold text-violet-600">{fmtBytes(info.memory_bytes)}</span>
            </div>
            <MiniBar value={info.memory_bytes} max={2 * 1024 ** 3} color="bg-violet-400" />
          </div>
        </div>
      )}

      {/* ── Datos del socket ── */}
      <div className="flex-1 overflow-auto px-4 py-1">

        <Row label="Puerto">
          <span className="font-mono text-indigo-600 font-bold text-base">{entry.port}</span>
          <span className="ml-2 px-1.5 py-0.5 rounded text-xs font-bold bg-indigo-100 text-indigo-700">{entry.protocol}</span>
        </Row>

        <Row label="Estado">
          <span className="text-sm">{entry.state}</span>
        </Row>

        <Row label="Dirección local">
          <span className="font-mono text-xs text-gray-600 break-all">{entry.local_addr}</span>
        </Row>

        {entry.remote_addr && (
          <Row label="Destino">
            <span className="font-mono text-xs text-gray-600 break-all">{entry.remote_addr}</span>
          </Row>
        )}

        <Row label="Usuario">
          <span>{entry.user ?? "—"}</span>
        </Row>

        {info && (
          <>
            <Row label="En ejecución desde">
              <span className="text-xs">{fmtStartTime(info.start_time)}</span>
              <span className="ml-2 text-xs text-gray-400">({fmtUptime(info.start_time)})</span>
            </Row>
          </>
        )}

        <Row label="Ruta del ejecutable">
          {entry.exe_path ? (
            <div className="flex items-start gap-2">
              <span className="font-mono text-xs text-gray-600 break-all flex-1">{entry.exe_path}</span>
              <button
                onClick={() => navigator.clipboard.writeText(entry.exe_path!)}
                className="text-gray-300 hover:text-indigo-500 transition-colors shrink-0 mt-0.5 text-xs"
                title="Copiar ruta"
              >
                ⧉
              </button>
            </div>
          ) : (
            <span className="text-gray-400 text-xs">No disponible</span>
          )}
        </Row>
      </div>

      {/* ── Acciones ── */}
      {entry.pid != null && (
        <div className="px-4 py-3 border-t border-gray-200 shrink-0">
          <button
            onClick={() => onKill(entry.pid!, entry.process_name, entry.source)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2
                       bg-red-50 text-red-600 border border-red-200 rounded-lg
                       text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <span>⚡</span>
            Matar proceso
          </button>
        </div>
      )}
    </div>
  );
}
