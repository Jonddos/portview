import { useState } from "react";
import type { PortEntry, ConnectionState } from "../types/port";

interface PortTableProps {
  entries: PortEntry[];
  loading: boolean;
  onKill: (pid: number, processName: string) => void;
  onRowClick: (entry: PortEntry) => void;
  selectedPid: number | null;
}

type SortKey = "port" | "protocol" | "state" | "process_name" | "pid";
type SortDir = "asc" | "desc";

// Colores de estado
const STATE_STYLE: Record<ConnectionState, { bg: string; text: string; dot: string }> = {
  Listen:      { bg: "bg-emerald-50",  text: "text-emerald-700", dot: "bg-emerald-500" },
  Established: { bg: "bg-blue-50",     text: "text-blue-700",    dot: "bg-blue-500"    },
  TimeWait:    { bg: "bg-amber-50",    text: "text-amber-700",   dot: "bg-amber-400"   },
  CloseWait:   { bg: "bg-orange-50",   text: "text-orange-700",  dot: "bg-orange-400"  },
  SynSent:     { bg: "bg-purple-50",   text: "text-purple-700",  dot: "bg-purple-400"  },
  SynReceived: { bg: "bg-violet-50",   text: "text-violet-700",  dot: "bg-violet-400"  },
  FinWait1:    { bg: "bg-gray-50",     text: "text-gray-500",    dot: "bg-gray-400"    },
  FinWait2:    { bg: "bg-gray-50",     text: "text-gray-500",    dot: "bg-gray-400"    },
  LastAck:     { bg: "bg-gray-50",     text: "text-gray-500",    dot: "bg-gray-400"    },
  Closing:     { bg: "bg-red-50",      text: "text-red-700",     dot: "bg-red-500"     },
  Unknown:     { bg: "bg-gray-50",     text: "text-gray-400",    dot: "bg-gray-300"    },
};

// Paleta de colores para el avatar de proceso (determinista por nombre)
const AVATAR_COLORS = [
  "bg-indigo-500", "bg-violet-500", "bg-sky-500", "bg-teal-500",
  "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-pink-500",
];

function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function ProcessAvatar({ name }: { name: string }) {
  const letter = name ? name[0].toUpperCase() : "?";
  const color  = avatarColor(name);
  return (
    <span className={`inline-flex items-center justify-center w-6 h-6 rounded text-white text-xs font-bold shrink-0 ${color}`}>
      {letter}
    </span>
  );
}

export function PortTable({ entries, loading, onKill, onRowClick, selectedPid }: PortTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("port");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const sorted = [...entries].sort((a, b) => {
    const av = a[sortKey] ?? "";
    const bv = b[sortKey] ?? "";
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortDir === "asc" ? cmp : -cmp;
  });

  const handleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-indigo-300 border-t-indigo-600 rounded-full animate-spin" />
        <span className="text-sm">Escaneando puertos...</span>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-400">
        <span className="text-3xl">🔍</span>
        <span className="text-sm">Sin resultados para los filtros actuales</span>
      </div>
    );
  }

  return (
    <div className="overflow-auto h-full">
      <table className="w-full text-sm border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-gray-50 border-b border-gray-200">
            <Th col="port"         label="Puerto"    cur={sortKey} dir={sortDir} onSort={handleSort} />
            <Th col="protocol"     label="Proto"     cur={sortKey} dir={sortDir} onSort={handleSort} />
            <Th col="state"        label="Estado"    cur={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Dirección local</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Destino</th>
            <Th col="process_name" label="Proceso"   cur={sortKey} dir={sortDir} onSort={handleSort} />
            <Th col="pid"          label="PID"       cur={sortKey} dir={sortDir} onSort={handleSort} />
            <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Usuario</th>
            <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide w-20">Kill</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((entry, idx) => {
            const st       = STATE_STYLE[entry.state];
            const isSelected = entry.pid != null && entry.pid === selectedPid;
            return (
              <tr
                key={`${entry.local_addr}-${entry.protocol}-${idx}`}
                onClick={() => onRowClick(entry)}
                className={`border-b border-gray-100 cursor-pointer transition-colors
                  ${isSelected ? "bg-indigo-50 border-l-2 border-l-indigo-500" : "hover:bg-slate-50"}`}
              >
                {/* Puerto */}
                <td className="px-4 py-2.5">
                  <span className="font-mono font-bold text-indigo-600 text-sm">{entry.port}</span>
                </td>

                {/* Protocolo */}
                <td className="px-4 py-2.5">
                  <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${
                    entry.protocol === "TCP"
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-teal-100 text-teal-700"
                  }`}>
                    {entry.protocol}
                  </span>
                </td>

                {/* Estado */}
                <td className="px-4 py-2.5">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {entry.state}
                  </span>
                </td>

                {/* Dir local */}
                <td className="px-4 py-2.5 font-mono text-xs text-gray-500">{entry.local_addr}</td>

                {/* Destino */}
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">
                  {entry.remote_addr || <span className="text-gray-200">—</span>}
                </td>

                {/* Proceso */}
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <ProcessAvatar name={entry.process_name} />
                    <span
                      className="font-medium text-gray-800 truncate max-w-[130px]"
                      title={entry.exe_path ?? entry.process_name}
                    >
                      {entry.process_name || <span className="text-gray-300 font-normal">—</span>}
                    </span>
                  </div>
                </td>

                {/* PID */}
                <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{entry.pid ?? "—"}</td>

                {/* Usuario */}
                <td className="px-4 py-2.5 text-xs text-gray-400 truncate max-w-[90px]">
                  {entry.user ?? "—"}
                </td>

                {/* Kill */}
                <td className="px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                  {entry.pid != null && (
                    <button
                      onClick={() => onKill(entry.pid!, entry.process_name)}
                      className="px-2 py-1 rounded text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 border border-transparent hover:border-red-200 transition-all"
                      title={`Matar ${entry.process_name}`}
                    >
                      ✕ Kill
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Th({
  col, label, cur, dir, onSort,
}: {
  col: SortKey; label: string; cur: SortKey; dir: SortDir;
  onSort: (k: SortKey) => void;
}) {
  const active = col === cur;
  return (
    <th
      onClick={() => onSort(col)}
      className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 transition-colors"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <span className={`text-gray-300 ${active ? "text-indigo-400" : ""}`}>
          {active ? (dir === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </span>
    </th>
  );
}
