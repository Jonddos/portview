import React, { useState } from "react";
import type { PortEntry, ConnectionState } from "../types/port";

interface PortTableProps {
  entries: PortEntry[];
  loading: boolean;
  onKill: (pid: number, processName: string) => void;
}

type SortKey = keyof Pick<PortEntry, "port" | "protocol" | "state" | "process_name" | "pid">;
type SortDir = "asc" | "desc";

const STATE_COLORS: Record<ConnectionState, string> = {
  Listen: "bg-green-100 text-green-800",
  Established: "bg-blue-100 text-blue-800",
  TimeWait: "bg-yellow-100 text-yellow-800",
  CloseWait: "bg-orange-100 text-orange-800",
  SynSent: "bg-purple-100 text-purple-800",
  SynReceived: "bg-purple-100 text-purple-800",
  FinWait1: "bg-gray-100 text-gray-600",
  FinWait2: "bg-gray-100 text-gray-600",
  LastAck: "bg-gray-100 text-gray-600",
  Closing: "bg-red-100 text-red-800",
  Unknown: "bg-gray-50 text-gray-400",
};

export function PortTable({ entries, loading, onKill }: PortTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("port");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = [...entries].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (col !== sortKey) return <span className="ml-1 opacity-30">↕</span>;
    return <span className="ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <div className="animate-spin mr-2">⟳</div>
        Escaneando puertos...
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No se encontraron puertos con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 bg-gray-50 border-b border-gray-200">
          <tr>
            <Th label="Puerto" col="port" onSort={handleSort} sortIcon={<SortIcon col="port" />} />
            <Th label="Protocolo" col="protocol" onSort={handleSort} sortIcon={<SortIcon col="protocol" />} />
            <Th label="Estado" col="state" onSort={handleSort} sortIcon={<SortIcon col="state" />} />
            <th className="px-4 py-3 text-left font-medium text-gray-600">Dirección local</th>
            <th className="px-4 py-3 text-left font-medium text-gray-600">Dirección remota</th>
            <Th label="Proceso" col="process_name" onSort={handleSort} sortIcon={<SortIcon col="process_name" />} />
            <Th label="PID" col="pid" onSort={handleSort} sortIcon={<SortIcon col="pid" />} />
            <th className="px-4 py-3 text-left font-medium text-gray-600">Usuario</th>
            <th className="px-4 py-3 text-center font-medium text-gray-600">Acción</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((entry, idx) => (
            <tr
              key={`${entry.local_addr}-${entry.protocol}-${idx}`}
              className="hover:bg-blue-50 transition-colors"
            >
              <td className="px-4 py-2 font-mono font-semibold text-indigo-700">{entry.port}</td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  entry.protocol === "TCP"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-teal-100 text-teal-700"
                }`}>
                  {entry.protocol}
                </span>
              </td>
              <td className="px-4 py-2">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATE_COLORS[entry.state]}`}>
                  {entry.state}
                </span>
              </td>
              <td className="px-4 py-2 font-mono text-xs text-gray-600">{entry.local_addr}</td>
              <td className="px-4 py-2 font-mono text-xs text-gray-400">{entry.remote_addr || "—"}</td>
              <td className="px-4 py-2 font-medium truncate max-w-[140px]" title={entry.exe_path ?? undefined}>
                {entry.process_name || <span className="text-gray-300">—</span>}
              </td>
              <td className="px-4 py-2 font-mono text-gray-500">{entry.pid ?? "—"}</td>
              <td className="px-4 py-2 text-gray-500 text-xs">{entry.user ?? "—"}</td>
              <td className="px-4 py-2 text-center">
                {entry.pid != null && (
                  <button
                    onClick={() => onKill(entry.pid!, entry.process_name)}
                    className="px-3 py-1 rounded text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors"
                    title={`Matar proceso ${entry.process_name} (PID ${entry.pid})`}
                  >
                    Matar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  label,
  col,
  onSort,
  sortIcon,
}: {
  label: string;
  col: SortKey;
  onSort: (k: SortKey) => void;
  sortIcon: React.ReactNode;
}) {
  return (
    <th
      className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900"
      onClick={() => onSort(col)}
    >
      {label}
      {sortIcon}
    </th>
  );
}
