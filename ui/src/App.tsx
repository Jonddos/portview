import { useState } from "react";
import { usePorts } from "./hooks/usePorts";
import { PortTable } from "./components/PortTable";
import { FilterBar } from "./components/FilterBar";
import { KillDialog } from "./components/KillDialog";

const REFRESH_OPTIONS = [
  { label: "Manual", value: 0 },
  { label: "2s", value: 2000 },
  { label: "5s", value: 5000 },
  { label: "10s", value: 10000 },
];

interface KillTarget {
  pid: number;
  processName: string;
}

export default function App() {
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [killTarget, setKillTarget] = useState<KillTarget | null>(null);
  const [killError, setKillError] = useState<string | null>(null);
  const [killSuccess, setKillSuccess] = useState<string | null>(null);

  const {
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
  } = usePorts({ refreshInterval });

  const handleKillRequest = (pid: number, processName: string) => {
    setKillTarget({ pid, processName });
    setKillError(null);
    setKillSuccess(null);
  };

  const handleKillConfirm = async () => {
    if (!killTarget) return;
    try {
      await killProcess(killTarget.pid, killTarget.processName);
      setKillSuccess(`Proceso "${killTarget.processName}" (PID ${killTarget.pid}) terminado.`);
    } catch (e) {
      setKillError(typeof e === "string" ? e : "Error al matar el proceso");
    } finally {
      setKillTarget(null);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 font-sans">
      {/* ── Barra superior ─────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-xl">🌐</span>
          <h1 className="text-base font-semibold text-gray-900">PortView</h1>
          {/* Indicador de privilegios */}
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              privilegeLevel === "full"
                ? "bg-green-100 text-green-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            {privilegeLevel === "full" ? "🟢 Vista completa" : "🔵 Vista parcial"}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-refresco */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Auto-refresco:</span>
            <div className="flex rounded-md border border-gray-200 overflow-hidden">
              {REFRESH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setRefreshInterval(opt.value)}
                  className={`px-3 py-1 text-xs transition-colors ${
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

          {/* Refresco manual */}
          <button
            onClick={refresh}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50 transition-colors"
          >
            <span className={loading ? "animate-spin" : ""}>⟳</span>
            Refrescar
          </button>
        </div>
      </header>

      {/* ── Notificaciones ──────────────────────────────────────────── */}
      {error && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
          <span>❌</span>
          <div>
            <strong>Error al escanear:</strong> {error}
            {error.includes("privilegios") && (
              <p className="mt-1 text-xs text-red-600">
                Intenta reiniciar PortView como administrador.
              </p>
            )}
          </div>
        </div>
      )}

      {killSuccess && (
        <div className="mx-4 mt-3 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 flex items-center justify-between">
          <span>✅ {killSuccess}</span>
          <button onClick={() => setKillSuccess(null)} className="text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      {killError && (
        <div className="mx-4 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center justify-between">
          <span>❌ {killError}</span>
          <button onClick={() => setKillError(null)} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* ── Filtros ──────────────────────────────────────────────────── */}
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        totalCount={entries.length}
        filteredCount={filteredEntries.length}
      />

      {/* ── Tabla principal ───────────────────────────────────────────── */}
      <main className="flex-1 overflow-hidden mx-4 my-3 bg-white rounded-xl border border-gray-200 shadow-sm">
        <PortTable
          entries={filteredEntries}
          loading={loading}
          onKill={handleKillRequest}
        />
      </main>

      {/* ── Pie ──────────────────────────────────────────────────────── */}
      <footer className="px-4 py-2 text-xs text-gray-400 text-right">
        {lastRefresh && `Última actualización: ${lastRefresh.toLocaleTimeString()}`}
      </footer>

      {/* ── Diálogo de confirmación ──────────────────────────────────── */}
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
