import { useState } from "react";
import { usePorts } from "./hooks/usePorts";
import { PortTable } from "./components/PortTable";
import { FilterBar } from "./components/FilterBar";
import { KillDialog } from "./components/KillDialog";
import { StatsBar } from "./components/StatsBar";
import { ProcessDetail } from "./components/ProcessDetail";
import { ElevationBanner } from "./components/ElevationBanner";
import type { PortEntry } from "./types/port";

const REFRESH_OPTIONS = [
  { label: "Manual", value: 0 },
  { label: "2s",     value: 2000 },
  { label: "5s",     value: 5000 },
  { label: "10s",    value: 10000 },
];

interface KillTarget { pid: number; processName: string; source: string }

export default function App() {
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [killTarget,  setKillTarget]  = useState<KillTarget | null>(null);
  const [selectedEntry, setSelectedEntry] = useState<PortEntry | null>(null);
  const [killError,   setKillError]   = useState<string | null>(null);
  const [killSuccess, setKillSuccess] = useState<string | null>(null);

  const {
    entries, filteredEntries, loading, error,
    lastRefresh, privilegeLevel,
    filters, setFilters, refresh, killProcess,
  } = usePorts({ refreshInterval });

  const handleKillRequest = (pid: number, processName: string, source = "Windows") => {
    setKillTarget({ pid, processName, source });
    setKillError(null);
    setKillSuccess(null);
  };

  const handleKillConfirm = async () => {
    if (!killTarget) return;
    try {
      await killProcess(killTarget.pid, killTarget.processName, killTarget.source);
      setKillSuccess(`"${killTarget.processName}" (PID ${killTarget.pid}) terminado. Si iniciaste un nuevo servicio en ese puerto, haz click en Refrescar para verlo.`);
      if (selectedEntry?.pid === killTarget.pid) setSelectedEntry(null);
    } catch (e) {
      setKillError(typeof e === "string" ? e : "Error al matar el proceso");
    } finally {
      setKillTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans select-none">

      {/* ── Topbar ──────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shadow-sm shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">P</div>
          <span className="text-sm font-semibold text-gray-900">PortView</span>
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            privilegeLevel === "full"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-sky-100 text-sky-700"
          }`}>
            {privilegeLevel === "full" ? "● Vista completa" : "● Vista parcial"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <span>Refresco:</span>
            <div className="flex rounded-md border border-gray-200 overflow-hidden text-xs">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRefreshInterval(opt.value)}
                  className={`px-2.5 py-1 transition-colors ${
                    refreshInterval === opt.value
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-40 transition-colors"
          >
            <span className={`text-sm ${loading ? "animate-spin inline-block" : ""}`}>⟳</span>
            Refrescar
          </button>
        </div>
      </header>

      {/* ── Notificaciones ──────────────────────────────────────────── */}
      {error && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2 shrink-0">
          <span className="mt-0.5">⚠</span>
          <span className="flex-1"><strong>Error de escaneo:</strong> {error}</span>
          <button onClick={() => {}} className="text-red-300 hover:text-red-500">✕</button>
        </div>
      )}
      {killSuccess && (
        <div className="mx-3 mt-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 flex items-center justify-between shrink-0">
          <span>✓ {killSuccess}</span>
          <button onClick={() => setKillSuccess(null)} className="text-emerald-400 hover:text-emerald-600 ml-3">✕</button>
        </div>
      )}
      {killError && (
        <div className="mx-3 mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between shrink-0">
          <span>✕ {killError}</span>
          <button onClick={() => setKillError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
        </div>
      )}

      {/* ── Banner de elevación (solo en vista parcial) ─────────────── */}
      {privilegeLevel === "partial" && (
        <ElevationBanner onElevating={() => setKillSuccess(null)} />
      )}

      {/* ── Stats ───────────────────────────────────────────────────── */}
      <StatsBar entries={entries} />

      {/* ── Filtros ──────────────────────────────────────────────────── */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        totalCount={entries.length}
        filteredCount={filteredEntries.length}
      />

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden mx-3 my-2 gap-2">

        {/* Tabla */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <PortTable
            entries={filteredEntries}
            loading={loading}
            onKill={handleKillRequest}
            onRowClick={setSelectedEntry}
            selectedPid={selectedEntry?.pid ?? null}
          />
        </div>

        {/* Panel de detalle — visible solo cuando hay fila seleccionada */}
        {selectedEntry && (
          <div className="w-72 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden shrink-0">
            <ProcessDetail
              entry={selectedEntry}
              onClose={() => setSelectedEntry(null)}
              onKill={handleKillRequest}
            />
          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="px-4 pb-2 text-xs text-gray-400 text-right shrink-0">
        {lastRefresh && `Actualizado: ${lastRefresh.toLocaleTimeString()}`}
      </footer>

      {/* ── Kill dialog ──────────────────────────────────────────────── */}
      {killTarget && (
        <KillDialog
          pid={killTarget.pid}
          processName={killTarget.processName}
          onConfirm={handleKillConfirm}
          onCancel={() => setKillTarget(null)}
        />
      )}
    </div>
  );
}
