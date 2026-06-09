import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ElevationBannerProps {
  onElevating: () => void;
}

export function ElevationBanner({ onElevating }: ElevationBannerProps) {
  const [dismissed, setDismissed]   = useState(false);
  const [loading,   setLoading]     = useState(false);
  const [error,     setError]       = useState<string | null>(null);

  if (dismissed) return null;

  const handleElevate = async () => {
    setLoading(true);
    setError(null);
    try {
      onElevating();
      await invoke("relaunch_as_admin");
      // Si llegamos aquí el proceso no se cerró (p. ej. el usuario canceló UAC)
    } catch (e) {
      setError(typeof e === "string" ? e : "No se pudo elevar el proceso");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-amber-50 border-b border-amber-200 shrink-0">
      {/* Icono */}
      <div className="w-7 h-7 rounded-full bg-amber-100 border border-amber-300 flex items-center justify-center shrink-0 text-amber-600 text-sm font-bold">
        !
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">Vista parcial — procesos del sistema ocultos</p>
        <p className="text-xs text-amber-600 mt-0.5">
          Sin privilegios de administrador solo se ven los procesos del usuario actual.
          Algunos puertos pueden no mostrar a qué proceso pertenecen.
        </p>
        {error && <p className="text-xs text-red-600 mt-1 font-medium">{error}</p>}
      </div>

      {/* Botón elevar */}
      <button
        onClick={handleElevate}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold
                   bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50
                   transition-colors shrink-0 whitespace-nowrap shadow-sm"
      >
        {loading ? (
          <>
            <span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
            Esperando UAC...
          </>
        ) : (
          <>
            <span>⬆</span>
            Elevar a Administrador
          </>
        )}
      </button>

      {/* Cerrar */}
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400 hover:text-amber-600 text-sm shrink-0 transition-colors"
        title="Ignorar"
      >
        ✕
      </button>
    </div>
  );
}
