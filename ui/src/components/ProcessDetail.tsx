import type { PortEntry } from "../types/port";

interface ProcessDetailProps {
  entry: PortEntry;
  onClose: () => void;
  onKill: (pid: number, processName: string) => void;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800 font-medium break-all">{value}</span>
    </div>
  );
}

import React from "react";

export function ProcessDetail({ entry, onClose, onKill }: ProcessDetailProps) {
  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <span className="text-base">🔍</span>
          <span className="text-sm font-semibold text-gray-800">Detalle del proceso</span>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-lg leading-none transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Proceso nombre + avatar */}
      <div className="px-4 py-4 border-b border-gray-100 bg-indigo-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            {entry.process_name ? entry.process_name[0].toUpperCase() : "?"}
          </div>
          <div>
            <div className="font-semibold text-gray-900">{entry.process_name || "Proceso desconocido"}</div>
            <div className="text-xs text-indigo-500">PID {entry.pid ?? "—"}</div>
          </div>
        </div>
      </div>

      {/* Datos */}
      <div className="flex-1 overflow-auto px-4 py-2">
        <DetailRow label="Puerto" value={
          <span className="font-mono text-indigo-600 font-bold">{entry.port}</span>
        } />
        <DetailRow label="Protocolo" value={entry.protocol} />
        <DetailRow label="Estado" value={entry.state} />
        <DetailRow label="Dirección local" value={
          <span className="font-mono text-xs">{entry.local_addr}</span>
        } />
        {entry.remote_addr && (
          <DetailRow label="Destino" value={
            <span className="font-mono text-xs">{entry.remote_addr}</span>
          } />
        )}
        <DetailRow label="Usuario" value={entry.user ?? "—"} />
        <DetailRow label="Ruta del ejecutable" value={
          entry.exe_path
            ? <span className="font-mono text-xs text-gray-600">{entry.exe_path}</span>
            : <span className="text-gray-400">No disponible</span>
        } />
      </div>

      {/* Acción */}
      {entry.pid != null && (
        <div className="px-4 py-3 border-t border-gray-200">
          <button
            onClick={() => onKill(entry.pid!, entry.process_name)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
          >
            <span>⚡</span>
            Matar proceso
          </button>
        </div>
      )}
    </div>
  );
}
