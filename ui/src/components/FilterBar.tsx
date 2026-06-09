import type { PortFilters, Protocol, ConnectionState } from "../types/port";

interface FilterBarProps {
  filters: PortFilters;
  onFilterChange: (partial: Partial<PortFilters>) => void;
  totalCount: number;
  filteredCount: number;
}

const PROTOCOLS: Array<Protocol | "ALL"> = ["ALL", "TCP", "UDP"];

const STATES: Array<ConnectionState | "ALL"> = [
  "ALL",
  "Listen",
  "Established",
  "TimeWait",
  "CloseWait",
  "Closing",
];

export function FilterBar({ filters, onFilterChange, totalCount, filteredCount }: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
      {/* Búsqueda libre */}
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Puerto, proceso, dirección..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="w-full pl-8 pr-4 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {filters.search && (
          <button
            onClick={() => onFilterChange({ search: "" })}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Protocolo */}
      <select
        value={filters.protocol}
        onChange={(e) => onFilterChange({ protocol: e.target.value as Protocol | "ALL" })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {PROTOCOLS.map((p) => (
          <option key={p} value={p}>
            {p === "ALL" ? "Todos los protocolos" : p}
          </option>
        ))}
      </select>

      {/* Estado */}
      <select
        value={filters.state}
        onChange={(e) => onFilterChange({ state: e.target.value as ConnectionState | "ALL" })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
      >
        {STATES.map((s) => (
          <option key={s} value={s}>
            {s === "ALL" ? "Todos los estados" : s}
          </option>
        ))}
      </select>

      {/* Solo escuchando */}
      <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={filters.onlyListening}
          onChange={(e) => onFilterChange({ onlyListening: e.target.checked })}
          className="rounded text-indigo-600 focus:ring-indigo-300"
        />
        Solo escuchando
      </label>

      {/* Contador */}
      <span className="ml-auto text-xs text-gray-400 whitespace-nowrap">
        {filteredCount === totalCount
          ? `${totalCount} puertos`
          : `${filteredCount} de ${totalCount}`}
      </span>
    </div>
  );
}
